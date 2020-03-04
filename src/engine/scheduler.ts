import { EventEmitter } from 'events'

import { SystemEvent } from './events'
import { Log } from '../logging'


// The maximum number of ms to wait before re-scheduling a paused task when resuming
const MAX_UNPAUSE_JITTER: number = 200


/**
 * Typedefs
 */
type TaskParams = any[]
type Task = (...args: TaskParams) => void


/**
 * The different states the scheduler can be in, used for pause/resume hanlding
 */
enum SchedulerState {
    RUNNING = "RUNNING",
    PAUSED = "PAUSED",
    STOPPED = "STOPPED"
}


/**
 * The different ways of scheduling a task
 */
enum TaskType {
    IMMEDIATE,
    TIMEOUT,
    PERIODIC
}


/**
 * Task specification.
 * @param task The function to execute
 * @param params The (optional) parameters to pass to the function
 * @param type Schedule immediatly or periodic
 * @param timtout Optional interval in ms, only for periodic or timeout
 */
interface ITask {
    task: Task,
    params: TaskParams,
    type: TaskType
    timeout?: number
}


/**
 * The Kodeventure task scheduling engine
 */
export class Scheduler {
    private state: SchedulerState
    private engine: EventEmitter
    private tasks: Map<number, ITask>
    private taskTimers: Map<number, NodeJS.Timeout>
    private taskCounter: number

    /**
     * Construct a task scheduler
     */
    constructor(engine: EventEmitter) {
        this.state = SchedulerState.RUNNING
        this.engine = engine
        this.tasks = new Map()
        this.taskTimers = new Map()
        this.taskCounter = 0

        this.engine.on(SystemEvent.GAME_PAUSED, this.handleGamePaused.bind(this))
        this.engine.on(SystemEvent.GAME_UNPAUSED, this.handleGameUnpaused.bind(this))
        this.engine.on(SystemEvent.GAME_ENDED, this.handleGameEnded.bind(this))

        Log.debug(`Constructed ${this}`, 'scheduler')
    }

    /**
     * Schedule a task to be run once, "immediately", but asynchronously
     * @param task The function to be executed
     * @param params The (optional) parameters to pass to the function
     */
    public scheduleNow(task: Task, ...params: TaskParams) {
        if (this.state === SchedulerState.RUNNING) {
            setImmediate(task, ...params)

            Log.debug(`Scheduled a task to run once`, 'scheduler')
        } else if (this.state === SchedulerState.PAUSED) {
            // We ignore the task ID, since it's not relevant for scheduleOnce
            this.registerTask(TaskType.IMMEDIATE, task, params)

            Log.debug(`Queued a task to run once with ${params.length} params, as scheduler is paused`, 'scheduler')
        } else {
            Log.error(`Request to schedule a task once, but scheduler state is ${this.state}`, 'scheduler')
        }
    }

    /**
     * Schedule a task to be run asynchronously after a given delay.
     * Returns a task ID that can be used to cancel the task.
     * @param task The function to be executed at a regular interval
     * @param delay The delay in miliseconds
     * @param params The (optional) parameters to pass to the function
     */
    public scheduleAfter(task: Task, delay: number, ...params: TaskParams): number {
        if (this.state === SchedulerState.RUNNING || this.state === SchedulerState.PAUSED) {
            const taskId = this.registerTask(TaskType.TIMEOUT, task, params, delay)

            if (this.state === SchedulerState.RUNNING) {
                // Since this is a non-periodic task, we need to clear it from the tasks list when it is completed
                const selfRemovingTask = () => {
                    task(...params)
                    this.tasks.delete(taskId)
                    this.taskTimers.delete(taskId)
                }

                this.taskTimers.set(taskId, setTimeout(selfRemovingTask, delay))
            } else {
                Log.debug(`Queued task ${taskId} to run after ${delay} ms with ${params.length} params, as scheduler is paused`, 'scheduler')
            }

            Log.debug(`Scheduled task ${taskId} to run after ${delay} ms with ${params.length} params`, 'scheduler')

            return taskId
        } else {
            Log.error(`Request to schedule a task after ${delay} ms, but scheduler state is ${this.state}`, 'scheduler')

            return -1
        }
    }

    /**
     * Schedule a task to be run to be asynchronously run at a regular interval.
     * Returns a task ID that can be used to cancel the task.
     * @param task The function to be executed at a regular interval
     * @param interval The interval in miliseconds
     * @param params The (optional) parameters to pass to the function
     */
    public schedulePeriodic(task: Task, interval: number, ...params: TaskParams): number {
        if (this.state === SchedulerState.RUNNING || this.state === SchedulerState.PAUSED) {
            const taskId = this.registerTask(TaskType.PERIODIC, task, params, interval)

            if (this.state === SchedulerState.RUNNING) {
                this.taskTimers.set(taskId, setInterval(task, interval, ...params))
                task(...params)
            } else {
                Log.debug(`Queued task ${taskId} to run every ${interval} ms with ${params.length} params, as scheduler is paused`, 'scheduler')
            }

            Log.debug(`Scheduled task ${taskId} to run every ${interval} ms with ${params.length} params`, 'scheduler')

            return taskId
        } else {
            Log.error(`Request to schedule a task every ${interval} ms, but scheduler state is ${this.state}`, 'scheduler')

            return -1
        }
    }

    /**
     * Cancel a periodic task or task that is queued for execution (if the game is paused)
     * @param task The Timeout object that was returned when the periodic task was scheduled.
     */
    public cancel(taskId: number) {
        if (this.tasks.has(taskId)) {
            if (this.state === SchedulerState.RUNNING) {
                const timer = this.taskTimers.get(taskId)

                if (timer) {
                    clearInterval(timer)
                    this.taskTimers.delete(taskId)
                } else {
                    Log.error(`Request to cancel task with ID ${taskId} that is registered, but did not have an associated timer`, 'scheduler')
                }
            }

            this.tasks.delete(taskId)

            Log.debug(`Cancelled task ${taskId}`, 'scheduler')
        } else {
            Log.error(`Request to cancel task with ID ${taskId}, but it was not registed`, 'scheduler')
        }
    }

    /**
     * Text representation of this task scheduler and its state
     */
    public toString(): string {
        return `Scheduler<${this.state}>[tasks: ${this.tasks.size}]`
    }

    /**
     * Add a task to the task pending (only intended for use when the game is paused)
     * Returns the taskId that was created for the task
     * @param type The type of the task
     * @param task The function to execute
     * @param params The (optional) parameters to pass to the function
     * @param timeout The optional imtout to run the task at, only relevant for periodic tasks and run once after delay tasks
     */
    private registerTask(type: TaskType, task: Task, params: TaskParams, timeout?: number): number {
        this.tasks.set(++this.taskCounter, {
            type: type,
            task: task,
            params: params,
            timeout: timeout
        })

        return this.taskCounter
    }

    /**
     * Event handler for when the GAME_PAUSED event is emitted from the engine
     */
    private handleGamePaused() {
        if (this.state === SchedulerState.RUNNING) {
            for (const timer of this.taskTimers.values()) {
                clearInterval(timer)
            }
            this.taskTimers.clear()

            this.state = SchedulerState.PAUSED

            Log.info(`Paused ${this}`, 'scheduler')
        } else {
            Log.error(`Request to pause all tasks, but scheduler is in ${this.state} state`, 'scheduler')
        }
    }

    /**
     * Event handler for when the GAME_UNPAUSED event is emitted from the engine
     */
    private handleGameUnpaused() {
        if (this.state === SchedulerState.PAUSED) {
            Log.info(`Starting unpause procedure for ${this}`, 'scheduler')
            
            // Add some jitter between each task to prevent bursting
            let jitter = Math.random() * MAX_UNPAUSE_JITTER

            for (const [taskId, task] of this.tasks) {
                Log.debug(`Scheduling ${taskId} to be resumed in ${jitter} ms`)

                setTimeout(() => {
                    if (task.type === TaskType.IMMEDIATE) {
                        setImmediate(task.task, ...task.params)
                    } else if (task.type === TaskType.PERIODIC) {
                        this.taskTimers.set(taskId, setInterval(task.task, task.timeout, ...task.params))
                    } else if (task.type === TaskType.TIMEOUT) {
                        // Since this is a non-periodic task, we need to clear it from the tasks list when it is completed
                        const selfRemovingTask = () => {
                            task.task(...task.params)
                            this.tasks.delete(taskId)
                            this.taskTimers.delete(taskId)
                        }

                        this.taskTimers.set(taskId, setTimeout(selfRemovingTask, task.timeout))
                    }
                }, jitter)

                jitter += Math.random() * MAX_UNPAUSE_JITTER
            }

            setTimeout(() => Log.info(`Unpause procedure complete`, 'scheduler'), jitter + 1)

            this.state = SchedulerState.RUNNING

            Log.info(`Resumed ${this}`, 'scheduler')
        } else {
            Log.error(`Request to unpause all tasks, but scheduler is in ${this.state} state`, 'scheduler')
        }
    }

    /**
     * Event handler for when the GAME_ENDED event is emitted from the engine
     */
    private handleGameEnded() {
        for (const timer of this.taskTimers.values()) {
            clearInterval(timer)
        }

        Log.debug(`Cleared all task timers`, 'scheduler')
    }
}
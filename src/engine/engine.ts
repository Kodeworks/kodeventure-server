import { EventEmitter } from 'events'
import { Request, Response } from 'express'

import { GameController } from '../controllers/gameController'
import { QuestMasterController } from '../controllers/questMasterController'
import { SystemEvent, IPlayerError, IPlayerConnectingEvent, IPlayerQuestUnlockedEvent } from './events'
import { Log } from '../logging'
import { Quest } from "../models/quest"
import { Player, UserDatabaseModel } from "../models/user"
import { Routes } from '../routes'
import { Scheduler } from './scheduler'

const DB_PERSIST_INTERVAL: number = 30000 // ms


/**
 * The different states the game engine can be in
 */
export enum GameState {
    STOPPED = "STOPPED",
    RUNNING = "RUNNING",
    PAUSED = "PAUSED",
    ENDED = "ENDED"
}


/**
 * Kodeventure Game Engine
 * Responsible for all event dispatching between components, player registry etc.
 */
export class GameEngine extends EventEmitter {
    private gameState: GameState
    private routes: Routes
    private api: GameController
    private questMaster: QuestMasterController
    private registeredPlayers: Map<string, Player>
    private quests: Map<string, Quest>

    public scheduler: Scheduler

    /**
     * Construct a GameEngine
     */
    constructor(routes: Routes) {
        super()

        this.gameState = GameState.STOPPED
        this.routes = routes
        this.api = new GameController(this)
        this.questMaster = new QuestMasterController(this)
        this.quests = new Map()
        this.registeredPlayers = new Map()
        this.scheduler = new Scheduler(this)

        this.configureGameEvents()
        this.startPeriodicDatabaseBackup()

        Log.debug(`Constructed ${this}`, 'engine')
    }

    /**
     * Fetch a single Player object based on his/her user token
     * @param token A player token
     */
    public getPlayer(token: string): Player | undefined {
        return this.registeredPlayers.get(token)
    }

    /**
     * Fetch a quest based on its baseRoute
     * @param baseRoute The baseRoute (identifier) of the quest
     */
    public getQuest(baseRoute: string): Quest | undefined {
        return this.quests.get(baseRoute)
    }

    /**
     * Get an array of all the registered starter quests
     */
    public getStarterQuests(): Quest[] {
        return Array.from(this.quests.values()).filter(q => q.starterQuest)
    }

    /**
     * Start the game, this can only be done from a STOPPED state
     */
    public start() {
        if (this.gameState !== GameState.STOPPED) {
            throw new Error('Cannot start, game already started!')
        }

        this.gameState = GameState.RUNNING

        this.emit(SystemEvent.GAME_STARTED, {
            msg: 'You feel a tingling sensation in your circuitry... Let the games begin!'
        })

        Log.info(`Started ${this}`, 'engine')
    }

    /**
     * Pause the game, this can only be done from a RUNNING state
     */
    public pause() {
        if (this.gameState !== GameState.RUNNING) {
            throw new Error('Cannot pause, game not running!')
        }

        this.gameState = GameState.PAUSED

        this.emit(SystemEvent.GAME_PAUSED, {
            msg: 'Oh noes, 4chan is raiding our server. Have some food and drink while we call Pepe to sort things out!'
        })

        Log.info(`Paused ${this}`, 'engine')
    }

    /**
     * Unpause the game, this can only be done from a PAUSED state
     */
    public unpause() {
        if (this.gameState !== GameState.PAUSED) {
            throw new Error('Cannot unpause, game not paused!')
        }

        this.gameState = GameState.RUNNING

        this.emit(SystemEvent.GAME_UNPAUSED, {
            msg: 'Never gonna give you up! Never gonna let you down! Uhm, I mean, we are live again! Good luck!'
        })

        Log.info(`Unpaused ${this}`, 'engine')
    }

    /**
     * Stop the game, this will transition into ENDED state, and can be invoked from any other state
     */
    public stop() {
        if (this.gameState === GameState.STOPPED) {
            throw new Error('Cannot stop, game already stopped')
        }

        this.gameState = GameState.ENDED

        this.emit(SystemEvent.GAME_ENDED, {
            msg: 'It seems we have run out of battery. Hope you had fun playing Kodeventure! We would love some feedback.'
        })

        Log.info(`Stopped ${this}`, 'engine')
    }

    /**
     * Text representation of the state of this GameEngine
     */
    public toString() {
        return `GameEngine[quests: ${this.quests.size}, players: ${this.registeredPlayers.size}]`
    }

    /**
     * Get an array of all registered players
     */
    public get players(): Player[] {
        return Array.from(this.registeredPlayers.values())
    }

    /**
     * Get the current state of the game engine
     */
    public get state(): GameState {
        return this.gameState
    }

    /**
     * Register a quest to the game engine
     * @param quest A quest inheriting from the Quest base class
     */
    public registerQuest(quest: Quest): void {
        if (this.quests.has(quest.baseRoute)) {
            return Log.error(`Could not register quest ${quest}, already registered!`, 'engine')
        }

        // Main quest route serves decription
        this.routes.get(`/quests/${quest.baseRoute}`, (req: Request, res: Response ) => {
            res.json({ description: quest.description })
        })

        // Register potential server routes the quest needs to function
        for (const questRoute of quest.routes) {
            const endpoint = `/quests/${quest.baseRoute}/${questRoute.route}`

            switch (questRoute.method.toUpperCase()) {
                case 'GET':
                    this.routes.get(endpoint, (req, res) => questRoute.handler(req, res))
                    break
                case 'POST':
                    this.routes.post(endpoint, (req, res) => questRoute.handler(req, res))
                    break
                case 'PUT':
                    this.routes.put(endpoint, (req, res) => questRoute.handler(req, res))
                    break
                default:
                    Log.error(`Could not register quest route: ${endpoint}, unsupported method ${questRoute.method}`)
            }
        }

        this.quests.set(quest.baseRoute, quest)

        Log.debug(`Registered quest ${quest}`, 'engine')
    }

    /**
     * Set up event listeners for all relevant game events and bridge events to relevant components
     */
    private configureGameEvents() {
        // API / CLI / RPC handling
        this.routes.post('/game/start', this.api.start.bind(this.api))
        this.routes.post('/game/pause', this.api.pause.bind(this.api))
        this.routes.post('/game/unpause', this.api.unpause.bind(this.api))
        this.routes.post('/game/stop', this.api.stop.bind(this.api))

        // QuestMaster
        this.routes.get('/questmaster', this.questMaster.request.bind(this.questMaster))

        // New player handling
        this.on(SystemEvent.PLAYER_CONNECTING, this.handlePlayerConnecting.bind(this))

        // Listen for quest unlocks and dispatch to correct quest accordingly
        this.on(SystemEvent.PLAYER_QUEST_UNLOCKED, this.handlePlayerQuestUnlocked.bind(this))
    }

    /**
     * Register a player to the current game engine
     * @param player The player to register
     */
    private registerPlayer(player: Player) {
        try {
            this.registeredPlayers.set(player.userToken, player)

            this.subscribeToPlayerEvents(player)

            Log.info(`${player}`, SystemEvent.PLAYER_CONNECTED)

            // Send a game_message event to the player over the websocket connection
            player.notify(`Welcome ${player.name}! Great adventures await in the bitfields of doom...`)
            if (this.gameState === GameState.STOPPED) {
                player.notify(`The game has not yet started, be patient while we download more RAM`)
            }

            this.emit(SystemEvent.PLAYER_CONNECTED, { player: player })

            const unlockActiveQuests = () => {
                // Signal quest unlock for all quests the player currently has active
                for (const quest of player.quests) {
                    const q = this.getQuest(quest)

                    if (q) {
                        this.emit(SystemEvent.PLAYER_QUEST_UNLOCKED, { player, quest: q })
                    } else {
                        Log.error(`Failed to find quest object for "${quest}"`, 'engine')
                    }
                }
            }

            // Unlock based on game state, aka only if not ended, and if stopped, hook into the game started event
            switch (this.state) {
                case GameState.STOPPED:
                    this.on(SystemEvent.GAME_STARTED, () => unlockActiveQuests())
                    break
                case GameState.RUNNING:
                case GameState.PAUSED:
                    unlockActiveQuests()
                    break
            }
        } catch (e) {
            Log.error(`Failed to register player ${player}: ${e.message}`, SystemEvent.PLAYER_CONNECTED)
        }
    }

    /**
     * Register the game engine as a listener to relevant player events
     * @param player A Player instance
     */
    private subscribeToPlayerEvents(player: Player) {
        player.on(SystemEvent.PLAYER_SCORE, data => this.emit(SystemEvent.PLAYER_SCORE, data))
        player.on(SystemEvent.PLAYER_TITLE, data => this.emit(SystemEvent.PLAYER_TITLE, data))
        player.on(SystemEvent.PLAYER_LOOT_OBTAINED, data => this.emit(SystemEvent.PLAYER_LOOT_OBTAINED, data))
        player.on(SystemEvent.PLAYER_LOOT_USED, data => this.emit(SystemEvent.PLAYER_LOOT_USED, data))
        player.on(SystemEvent.PLAYER_QUEST_UNLOCKED, data => this.emit(SystemEvent.PLAYER_QUEST_UNLOCKED, data))
        player.on(SystemEvent.PLAYER_QUEST_COMPLETED, data => this.emit(SystemEvent.PLAYER_QUEST_COMPLETED, data))
    }

    /**
     * Schedule a periodic task that saves the state of all currently registered players
     */
    private async startPeriodicDatabaseBackup() {
        const persist = () => {
            Log.info('Persisting game state to database', 'engine')

            for (const player of this.players) {
                player.save()
            }
        }

        // Persist to database at a predefined interval
        this.scheduler.schedulePeriodic(persist, DB_PERSIST_INTERVAL)
    }

    /**
     * Event handler for when a player has unlocked a new quest
     * @param data The player quest unlocked event data
     */
    private handlePlayerQuestUnlocked(data: IPlayerQuestUnlockedEvent) {
        data.player.notify(`You have unlocked ${data.quest}, a challenge awaits!`)

        data.quest.unlock(data.player)
    }

    /**
     * Event handler for when a player has connected
     * @param data The player connected event data
     */
    private async handlePlayerConnecting(data: IPlayerConnectingEvent) {
        if (this.registeredPlayers.has(data.token)) {
            const player = this.registeredPlayers.get(data.token)

            player.update(data)

            // Send a game_message event to the player over the websocket connection
            player.notify(`Welcome back ${player.name}! May you fare better this time...`)
            if (this.gameState === GameState.PAUSED) {
                player.notify(`The game is currently paused, have some food and drink while we wait for Pepe to sort things out`)
            }

            this.emit(SystemEvent.PLAYER_RECONNECTED, { player: player })
        } else {
            try {
                const player = await Player.get(data.token, data.ip, data.ws)

                this.registerPlayer(player)
            } catch (e) {
                const payload: IPlayerError = { msg: `Could not find player with token "${data.token}"` }

                data.ws.send(JSON.stringify({ type: SystemEvent.PLAYER_ERROR, data: payload }))
                data.ws.close()

                const source = `${data.ip}:${data.port}`

                Log.error(`${payload.msg} (connection attempt: ${source})`, SystemEvent.PLAYER_CONNECTING)
            }
        }
    }

    /**
     * Starts a full system simulation with N concurrent players that unlocks one starter quest each.
     * WARNING: WILL PURGE THE DATABASE
     * @param numPlayers The number of concurrent players
     * @param numStarterQuests The total number of starter quests to unlock (offset by 20 seconds each)
     */
    public async simulate(numPlayers: number, numStarterQuests: number = 1) {
        const MAX_JITTER: number = 200 // ms
        const users = []

        Log.info(`Starting simulation with ${numPlayers} players`)

        Log.info('Purging database')
        await UserDatabaseModel.deleteMany({}, error => {
            if (error) Log.error(`Error deleting users: ${error}`)
        })

        // Update the database by cleaning old players and inserting new
        for (let i = 1; i < numPlayers + 1; i++) {
            users.push({
                name: `Robot Player ${i}`,
                token: `token_${i}`,
                server_token: `server_token_${i}`,
                score: 0,
                titles: [] as string[],
                loot: [] as string[],
                activeQuests: [] as string[],
                completedQuests: [] as string[]
            })
        }

        Log.info('Populating database')
        await UserDatabaseModel.insertMany(users, (err, data) => { if (err) Log.error(err) })

        Log.info('Simulating player connections')
        for (const user of users) {
            const playerConnectingEvent: any = {
                token: user.token,
                // Mock the used ws methods
                ws: {
                    send: (...args: any[]): void => {},
                    on: (...args: any[]): void => {},
                    close: (...args: any[]): void => {}
                },
                ip: '127.0.0.1',
                port: 10000
            }

            await this.handlePlayerConnecting(playerConnectingEvent)
        }

        // Pre-fetch the starter quests so we don't get any issues with delayed unlock / race condition
        const quests = new Map<Player, Quest[]>()

        for (const player of this.players) {
            const starterQuests = []

            for (let i = 0; i < numStarterQuests; i++) {
                starterQuests.push(this.questMaster.getRandomStarterQuest(player))
            }

            quests.set(player, starterQuests)
        }

        /**
         * Simulate N number of players and M number of quests unlocked in succession
         */
        const simulator = () => {
            let jitter = Math.random() * MAX_JITTER

            for (let i = 0; i < numStarterQuests; i++) {
                for (const player of this.players) {
                    this.scheduler.scheduleAfter(() => {
                        player.unlockQuest(this.questMaster.getRandomStarterQuest(player))
                    }, jitter)

                    jitter += Math.random() * MAX_JITTER
                }
            }
        }

        Log.info('Starting game in 10 seconds')
        this.scheduler.scheduleAfter(() => this.start(), 10000)

        Log.info('Simulating quest unlocks in 20 seconds')
        this.scheduler.scheduleAfter(simulator, 20000)
    }
}

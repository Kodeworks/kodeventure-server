import { EventEmitter } from 'events'
import { Request, Response } from 'express'

import { GameController } from '../controllers/gameController'
import { SystemEvent, IPlayerError, IPlayerConnectingEvent } from './events'
import { Log } from '../logging'
import { Quest, ExampleQuest } from "../models/quest"
import { Player } from "../models/user"
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
        this.quests = new Map()
        this.registeredPlayers = new Map()
        this.scheduler = new Scheduler(this)

        this.configureGameEvents()
        this.startPeriodicDatabaseBackup()

        // Register the quests here, TODO: Move to some more fancy mechanism of defining the quest set
        this.registerQuest(new ExampleQuest(this))

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
     * Start the game, this can only be done from a STOPPED state
     */
    public start() {
        if (this.gameState !== GameState.STOPPED) {
            throw new Error('Cannot start, game already started!')
        }

        this.gameState = GameState.RUNNING

        this.emit(SystemEvent.GAME_STARTED, {
            msg: 'You feel a tingling sensation in your circuitry... Ask /quest/questmaster for some advice!'
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
    private registerQuest(quest: Quest): void {
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
                    this.routes.get(endpoint, questRoute.handler)
                    break
                case 'POST':
                    this.routes.post(endpoint, questRoute.handler)
                    break
                case 'PUT':
                    this.routes.put(endpoint, questRoute.handler)
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

        // New player handling
        this.on(SystemEvent.PLAYER_CONNECTING, this.handlePlayerConnecting.bind(this))
    }

    /**
     * Register a player to the current game engine
     * @param player The player to register
     */
    private registerPlayer(player: Player) {
        this.registeredPlayers.set(player.userToken, player)
        this.subscribeToPlayerEvents(player)

        Log.info(`${player}`, SystemEvent.PLAYER_CONNECTED)

        // Send a game_message event to the player over the websocket connection
        player.notify(`Welcome ${player.name}! Great adventures await in the bitfields of doom...`)
        if (this.gameState === GameState.STOPPED) {
            player.notify(`The game has not yet started, be patient while we download more RAM`)
        }

        this.emit(SystemEvent.PLAYER_CONNECTED, { player: player })

        // TODO: REMOVE, DEMO ONLY
        this.emit(SystemEvent.PLAYER_QUEST_UNLOCKED, { player: player, quest: this.getQuest('/example-quest')})
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
    }

    /**
     * Schedule a periodic task that saves the state of all currently registered players
     */
    private async startPeriodicDatabaseBackup() {
        // TODO: Put into upcoming event scheduler
        const persist = () => {
            Log.info('Persisting game state to database', 'engine')

            for (const player of this.players) {
                player.save()
            }

            setTimeout(persist, DB_PERSIST_INTERVAL)
        }

        // Wait before the first persist
        setTimeout(persist, DB_PERSIST_INTERVAL)
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

            this.emit(SystemEvent.PLAYER_RECONNECTED, { player: player })
        } else {
            try {
                const player = await Player.get(data.token, data.ip, data.ws)

                this.registerPlayer(player)
            } catch {
                const payload: IPlayerError = { msg: `Could not find player with token "${data.token}"` }

                data.ws.send(JSON.stringify({ type: SystemEvent.PLAYER_ERROR, data: payload }))
                data.ws.close()

                const source = `${data.ip}:${data.port}`

                Log.error(`${payload.msg} (connection attempt: ${source})`, SystemEvent.PLAYER_CONNECTING)
            }
        }
    }
}

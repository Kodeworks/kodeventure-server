import { EventEmitter } from 'events'
import { Request, Response } from 'express'

import { SystemEvent, IPlayerError, IPlayerConnectingEvent } from './events'
import { Log } from '../logging'
import { Quest, ExampleQuest } from "../models/quest"
import { Player } from "../models/user"
import { Routes } from 'routes'

/**
 * Kodeventure Game Engine
 * Responsible for all event dispatching between components, player registry etc.
 */
export class GameEngine extends EventEmitter {
    private registeredPlayers: Map<string, Player>
    private routes: Routes
    private quests: Map<string, Quest>

    /**
     * Construct a GameEngine
     */
    constructor(routes: Routes) {
        super()

        this.quests = new Map()
        this.registeredPlayers = new Map()
        this.routes = routes

        this.configureGameEvents()

        // Register the quests here, TODO: Move to some more fancy mechanism of defining the quest set
        this.registerQuest(new ExampleQuest(this))
    }
    
    /**
     * Get an array of all registered players
     */
    public get players(): Player[] {
        return Array.from(this.registeredPlayers.values())
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
     * Register a quest to the game engine
     * @param quest A quest inheriting from the Quest base class
     */
    private registerQuest(quest: Quest): void {
        if (this.quests.has(quest.baseRoute)) {
            return Log.error(`Could not register quest ${quest}, already registered!`, "engine")
        }

        this.routes.get(quest.baseRoute, (req: Request, res: Response ) => {
            res.json({ description: quest.description })
        })

        // Register potential server routes the quest needs to function
        for (const questRoute of quest.routes) {
            const endpoint = `${quest.baseRoute}/${questRoute.route}`

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

        Log.info(`Registered quest ${quest}`, "engine")
    }

    /**
     * Set up event listeners for all relevant game events and bridge events to relevant components
     */
    private configureGameEvents() {
        // Base setup
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
        player.notify(`Welcome ${player.name}! Great adventures lay before you, across the bit fields of doom...`)

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

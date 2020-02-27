import { EventEmitter } from 'events'

import { SystemEvent, IPlayerConnectedEvent, IPlayerScoreEvent, IPlayerError, IPlayerConnectingEvent } from './events'
import { Log } from '../logging'
import { Quest } from "../models/quest"
import { Player } from "../models/user"

export class GameEngine extends EventEmitter {
    private registeredPlayers: Map<string, Player>
    private quests: Set<Quest>

    constructor() {
        super()

        this.registeredPlayers = new Map()
        this.quests = new Set()

        this.on(SystemEvent.PLAYER_CONNECTING, this.handlePlayerConnecting.bind(this))
    }

    /**
     * Get an iterator of all registered players
     */
    public get players(): IterableIterator<Player> {
        return this.registeredPlayers.values()
    }

    public registerQuest(quest: Quest) {
        this.quests.add(quest)
    }

    public removeQuest(quest: Quest) {
        this.quests.delete(quest)
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
                const player = await Player.get(data.token, data.ip, data.port, data.ws)

                this.registerPlayer(player)
            } catch {
                const payload: IPlayerError = { msg: `Could not find player with token "${data.token}"` }

                data.ws.send(JSON.stringify({ type: SystemEvent.PLAYER_ERROR, data: payload }))
                data.ws.close()

                const source = `${data.ip}:${data.port}`

                Log.error(`${payload.msg} (connection attempt: ${source})`, "db")
            }
        }
    }
}

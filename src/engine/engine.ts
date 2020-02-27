import { EventEmitter } from 'events'

import { SystemEvent, IPlayerConnectedEvent, IPlayerScoreEvent, IPlayerError } from './events'
import { Log } from '../logging'
import { Quest } from "../models/quest"
import { Player } from "../models/user"

export class GameEngine extends EventEmitter {
    private players: Map<string, Player>
    private quests: Set<Quest>

    constructor() {
        super()

        this.players = new Map()
        this.quests = new Set()

        this.on(SystemEvent.PLAYER_CONNECTED_PRE_AUTH, this.handlePlayerConnected.bind(this))

        this.on(SystemEvent.PLAYER_SCORE, (data: IPlayerScoreEvent) => {
            Log.debug(`${data.player} now has ${data.player.score} points!`, SystemEvent.PLAYER_SCORE)
        })
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
        this.players.set(player.userToken, player)
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
    private async handlePlayerConnected(data: IPlayerConnectedEvent) {
        if (this.players.has(data.token)) {
            const player = this.players.get(data.token)

            player.update(data)

            // Send a game_message event to the player over the websocket connection
            player.notify(`Welcome back ${player.name}! May you fare better this time...`)

            this.emit(SystemEvent.PLAYER_CONNECTED, { player: player })
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

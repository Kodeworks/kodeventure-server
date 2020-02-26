import { EventEmitter } from 'events'

import { Quest } from "../models/quest"
import { Player } from "../models/user"
import {
    SystemEvent,
    IPlayerConnectedEvent,
    IPlayerScoreEvent,
} from './events'

export class GameEngine extends EventEmitter {
    private players: Map<string, Player>
    private quests: Set<Quest>

    constructor() {
        super()

        this.players = new Map()
        this.quests = new Set()

        this.on(SystemEvent.PLAYER_CONNECTED, this.handlePlayerConnected.bind(this))

        this.on(SystemEvent.PLAYER_SCORE, (data: IPlayerScoreEvent) => {
            console.log(`${data.player} now has ${data.player.score} points!`)
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

        console.log(`Registered new player: ${player}`)

        // Send a game_message event to the player over the websocket connection
        player.notify(`Welcome ${player.name}! Great adventures lay before you, across the bit fields of doom...`)
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
        } else {
            try {
                const player = await Player.get(data.token, data.ip, data.port, data.ws)

                this.registerPlayer(player)
            } catch {
                console.error(`[ERR] Could not find player with token "${data.token}"`)
            }
        }
    }
}
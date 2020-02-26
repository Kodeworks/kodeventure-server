import { EventEmitter } from 'events'

import { Quest } from "../models/quest"
import { Player } from "../models/user"
import {
    SystemEvent,
    IPlayerConnectedEvent
} from './events'

export class GameEngine extends EventEmitter {
    private players: Map<string, Player>
    private quests: Set<Quest>

    constructor() {
        super()

        this.players = new Map()
        this.quests = new Set()

        this.on(SystemEvent.PLAYER_CONNECTED, this.handlePlayerConnected.bind(this))
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
        // If we already have a player object for this player, just update it with the new connection information
        if (this.players.has(player.userToken)) {
            const existing = this.players.get(player.userToken)
            console.log(`Updating player ${existing} based on ${player}`)
            existing.update(player)
        } else {
            console.log(`Adding new player ${player}`)
            this.players.set(player.userToken, player)
        }
    }

    /**
     * Event handler for when a player has connected
     * @param data 
     */
    private async handlePlayerConnected(data: IPlayerConnectedEvent) {
        try {
            const player = await Player.get(data.token, data.ip, data.port, data.ws)
            this.registerPlayer(player)
        } catch {
            console.error(`[ERR] Could not find player with token "${data.token}"`)
        }
    }
}
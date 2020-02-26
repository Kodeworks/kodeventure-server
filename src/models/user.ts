import { EventEmitter } from 'events'
import WebSocket from 'ws'
import mongoose, { Document, Schema } from 'mongoose'

import { SystemEvent, IPlayerConnectedEvent, IGameMessageEvent } from '../engine/events'

const UserSchema: Schema = new Schema({
    token: { type: String, unique: true, required: true },
    server_token: { type: String, unique: true, required: true },
    name: { type: String, required: true, unique: true },
    score:  { type: Number, required: true },
    titles: { type: [String], required: true },
    loot: { type: [String], required: true }
})

export interface IUser extends Document {
    token: string
    server_token: string
    name: string
    score: number
    titles: string[]
    loot: string[]
}

export const UserDatabaseModel = mongoose.model<IUser>('User', UserSchema)

/**
 * Player class for the Kodeventure programming RPG
 */
export class Player extends EventEmitter {
    private user: IUser
    private ip: string
    private port: number
    private ws: WebSocket

    /**
     * Construct a player instance. Kept protected to disallow directly instantiating a player instance without going through the
     * static get() method that fetches associated user data from the database.
     * @param user The user document object from the database
     * @param ip The IP the player is connecting from
     * @param port The port the player has configured for his/her web server instance
     * @param ws The websocket object the player is currently connected with
     */
    protected constructor(user: IUser, ip: string, port: number, ws: WebSocket) {
        super()

        this.user = user
        this.ip = ip
        this.port = port
        this.ws = ws

        this.configureWebsocket()
    }

    /**
     * Get this player's name
     */
    public get name(): string {
        return this.user.name
    }

    /**
     * Get this player's current score
     */
    public get score(): number {
        return this.user.score
    }

    /**
     * Add or subtract an amount of experience points on this player
     * @param xp A positive or negative amount of experience
     */
    public addScore(xp: number) {
        this.user.score += xp

        this.emit(SystemEvent.PLAYER_SCORE, { player: this })
    }

    /**
     * Get this player's current titles
     */
    public get titles(): string[] {
        return this.user.titles
    }

    /**
     * Add a title to this player's current feats of strength and valor
     * @param title The newly claimed title
     */
    public addTitle(title: string) {
        this.user.titles.push(title)

        this.emit(SystemEvent.PLAYER_TITLE, { player: this, title: title })
    }

    /**
     * Get this player's current loot
     */
    public get loot(): string[] {
        return this.user.loot
    }

    /**
     * Add some danque loot to this player's inventory
     * @param loot The newly claimed loot
     */
    public addLoot(loot: string) {
        this.loot.push(loot)

        this.emit(SystemEvent.PLAYER_LOOT_OBTAINED, { player: this, loot: loot })
    }

    /**
     * Check whether or not this player has at least one of the specified loot item
     * @param loot The loot to check for
     */
    public hasLoot(loot: string) {
        return this.loot.indexOf(loot) >= 0
    }

    /**
     * Consume an item from this player's current inventory.
     * Throws an exception if the loot item does not exist.
     * @param loot The loot to use
     */
    public useLoot(loot: string) {
        const i = this.loot.indexOf(loot)

        if (i < 0) {
            throw new Error(`${this} has no item called "${loot}"`)
        }

        this.loot.splice(i, 1)

        this.emit(SystemEvent.PLAYER_LOOT_USED, { player: this, loot: loot })
    }

    /**
     * Get this player's unique token
     */
    public get userToken(): string {
        return this.user.token
    }

    /**
     * Get this player's unique server token
     */
    public get serverToken(): string {
        return this.user.server_token
    }

    /**
     * Get this plaer's current websocket connection
     */
    public get websocket(): WebSocket {
        return this.ws
    }

    /**
     * Send a standard game message notification to the player over the websocket connection
     * @param msg The message to send
     */
    public notify(msg: string) {
        const payload = { type: SystemEvent.GAME_MESSAGE, data: { msg: msg } }

        this.ws.send(JSON.stringify(payload))
    }

    /**
     * Persist the current state of the player to the database
     */
    public save() {
        this.user.save()
    }

    /**
     * Update this player object with information from an updated player connection event.
     * This disregards all user document data, as we're only interested in remote IP, port and websocket object.
     * @param data The player connected event payload
     */
    public update(data: IPlayerConnectedEvent) {
        // Make sure we purge all listeners before discarding the object so we make the gc happy
        this.ws.removeAllListeners()

        console.log(`Updating ${this} with new connection: ${data.ip}:${data.port}`)

        this.ip = data.ip
        this.port = data.port
        this.ws = data.ws

        this.configureWebsocket()
    }

    /**
     * Text representation of this player object
     */
    public toString(): string {
        return `Player<${this.user.name}>[${this.ip}:${this.port}]`
    }

    /**
     * JSON serialized version of this player intended for public display on leaderboard. No credentials on display.
     */
    public toJson(): string {
        return JSON.stringify({
            name: this.name,
            score: this.score,
            titles: this.titles,
            loot: this.loot
        })
    }

    /**
     * Fetch the player corresponding to the given token from the database and return a Player object with
     * the current connection information.
     *
     * @param token The unique player token
     * @param ip The IP address the player is connecting from
     * @param port The port the player is running his/her web server on
     */
    public static async get(token: string, ip: string, port: number, ws: WebSocket): Promise<Player> {
        const user = await UserDatabaseModel.findOne({'token': token})

        if (!user || user.token !== token) {
            throw Error(`Failed to fetch user with token "${token}"`)
        }

        return new Player(user, ip, port, ws)
    }

    /**
     * Configure the currently active websocket and attach event handlers
     */
    private configureWebsocket() {
        this.ws.on('message', this.handleMessage.bind(this))
        this.ws.on('error', this.handleError.bind(this))
        this.ws.on('close', this.handleClose.bind(this))
    }

    /**
     * Websocket message handler for this player
     * @param msg The serialized message envelope from this player
     */
    private handleMessage(msg: string) {
        // TODO: Parse JSON and emit event
        console.log(`[MSG] ${this}: ${msg}`)
    }

    /**
     * Websocket error handler for this player
     * @param error The error thrown by the socket
     */
    private handleError(error: Error) {
        // TODO: do what. emit event? lot?
        console.error(`[ERR] WS error for ${this}: ${error}`)
    }

    /**
     * Websocket close handler for this player
     * @param code The close code returned
     * @param reason The reason given
     */
    private handleClose(code: number, reason: string) {
        // TODO: emit event
        console.log(`[DISCONNECT] ${this}`)
    }
}
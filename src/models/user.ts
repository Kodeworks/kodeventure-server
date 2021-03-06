import { EventEmitter } from 'events'
import fetch from 'node-fetch'
import AbortController from 'abort-controller';
import mongoose, { Document, Schema } from 'mongoose'
import WebSocket from 'ws'

import { PLAYER_PORT } from '../config'
import { SystemEvent, IPlayerConnectingEvent } from '../engine/events'
import { Log } from '../logging'
import { Quest } from './quest'

/**
 * Mongoose User schema for MongoDB
 */
const UserSchema: Schema = new Schema({
    token: { type: String, unique: true, required: true },
    server_token: { type: String, unique: true, required: true },
    name: { type: String, required: true, unique: true },
    score: { type: Number, required: true },
    titles: { type: [String], required: true },
    loot: { type: [String], required: true },
    activeQuests: { type: [String], required: true },
    completedQuests: { type: [String], required: true }
})

/**
 * Convenience interface representing the fields of a user
 */
export interface IUser extends Document {
    token: string
    server_token: string
    name: string
    score: number
    titles: string[]
    loot: string[],
    activeQuests: string[],
    completedQuests: string[]
}

/**
 * Interface representing the available fields of a public user (when sent to scoreboard or other players)
 */
export interface IPublicUser {
    name: string,
    score: number,
    titles: string[],
    loot: string[]
    completedQuests: number
}

/**
 * The Mongoose database model object for the User schema
 */
export const UserDatabaseModel = mongoose.model<IUser>('User', UserSchema)

/**
 * Player class for the Kodeventure programming RPG
 */
export class Player extends EventEmitter {
    private user: IUser
    private ip: string
    private ws: WebSocket

    /**
     * Construct a player instance. Kept protected to disallow directly instantiating a player instance without going through the
     * static get() method that fetches associated user data from the database.
     * @param user The user document object from the database
     * @param ip The IP the player is connecting from
     * @param ws The websocket object the player is currently connected with
     */
    protected constructor(user: IUser, ip: string, ws: WebSocket) {
        super()

        this.user = user
        this.ip = ip
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

        if (xp !== 0) {
            this.emit(SystemEvent.PLAYER_SCORE, { player: this })
        }
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

        this.notify(`You earned the title: ${title}`)

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

        this.notify(`You obtained some shiny loot: ${loot}`)

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
            return Log.error(`${this} has no item called "${loot}"`)
        }

        this.loot.splice(i, 1)

        this.notify(`Your item "${loot}" was claimed`)

        this.emit(SystemEvent.PLAYER_LOOT_USED, { player: this, loot: loot })
    }

    /**
     * Add a quest to this player's acive quests. Used to track what is unlocked and not.
     * @param quest The name of a quest, i.e it's main identifier
     */
    public unlockQuest(quest: Quest) {
        const score = this.score < 0 ? 0 : this.score

        if (this.hasActiveQuest(quest.name) || this.hasCompletedQuest(quest.name) || score < quest.minimumScoreRequirement) {
            return Log.warning(`${this} has already unlocked or completed ${quest} or too low score. Ignoring.`)
        }

        this.quests.push(quest.name)

        Log.info(`${this} has unlocked ${quest.name}`)

        this.emit(SystemEvent.PLAYER_QUEST_UNLOCKED, { player: this, quest: quest })
    }

    /**
     * Remove a quest from this player's list of active quests
     * @param quest The quest to complete
     * @param msg An optional message to send to the player upon completion
     */
    public completeQuest(quest: Quest, msg?: string) {
        const i = this.quests.indexOf(quest.name)

        if (i < 0) {
            return Log.error(`${this} has no active quest called "${quest}". Ignoring.`)
        }

        this.user.activeQuests.splice(i, 1)
        this.user.completedQuests.push(quest.name)

        // Send the completion message if we received one
        if (msg) {
            this.notify(msg)
        }

        Log.info(`${this} has completed ${quest.name}`)

        this.emit(SystemEvent.PLAYER_QUEST_COMPLETED, { player: this, quest: quest })
    }

    /**
     * Check if this user current has the provided quest activated
     * @param quest The quest name to check
     */
    public hasActiveQuest(quest: string) {
        return this.quests.indexOf(quest) >= 0
    }

    /**
     * Check if this user has already completed the provided quest
     * @param quest The quest name to check
     */
    public hasCompletedQuest(quest: string) {
        return this.user.completedQuests.indexOf(quest) >= 0
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
     * Get this player's current websocket connection
     */
    public get websocket(): WebSocket {
        return this.ws
    }

    /**
     * Get this player's client ip
     */
    public get hostname(): string {
        return `${this.ip}`
    }

    /**
     * Get this player's currently active quests
     */
    public get quests(): string[] {
        return this.user.activeQuests
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

        Log.debug(`Persisted current state of ${this}`, "db")
    }

    /**
     * Update this player object with information from an updated player connection event.
     * This disregards all user document data, as we're only interested in remote IP and websocket object.
     * @param data The player connected event payload
     */
    public update(data: IPlayerConnectingEvent) {
        // Make sure we purge all listeners before discarding the object so we make the gc happy
        this.ws.removeAllListeners()

        this.ip = data.ip
        this.ws = data.ws

        Log.debug(`${this} reconnected from: ${this.hostname}`, SystemEvent.PLAYER_RECONNECTED)

        this.configureWebsocket()
    }

    /**
     * Text representation of this player object
     */
    public toString(): string {
        return `Player<${this.name}>[${this.hostname}]`
    }

    /**
     * Sanitized representation of this player intended for public display on leaderboard. No credentials on display.
     */
    public sanitize(): IPublicUser {
        return {
            name: this.name,
            score: this.score,
            titles: this.titles,
            loot: this.loot,
            completedQuests: this.user.completedQuests.length
        }
    }

    /**
     * Fetch the player corresponding to the given token from the database and return a Player object with
     * the current connection information.
     *
     * @param token The unique player token
     * @param ip The IP address the player is connecting from
     */
    public static async get(token: string, ip: string, ws: WebSocket): Promise<Player> {
        let user = await UserDatabaseModel.findOne({'token': token}, err => {
            if (err) Log.error(err)
        })

        // If it doesn't work on the 2nd try, give up
        if (!user) {
            // This stupid shit needs to be here. For some reason, sometimes on the first document after an operation,
            // null is returned. Try again and it succeeds.
            user = await UserDatabaseModel.findOne({'token': token})

            if (!user) throw Error(`Failed to fetch user with token "${token}"`)
        }

        return new Player(user, ip, ws)
    }

    /**
     * Send a HTTP GET request
     * @param route The route to GET.
     * @param requestTimeoutMs The request timeout in milliseconds.
     */
    public sendHttpGetRequest = async (route: string, requestTimeoutMs = 3000) => {
        return this.sendHttpRequest(route, 'GET', requestTimeoutMs)
    }

    /**
     * Send a HTTP POST request
     * @param route The route to POST to.
     * @param payload The object that will be posted.
     * @param requestTimeoutMs The request timeout in milliseconds.
     */
    public sendHttpPostRequest = async (route: string, payload: object, requestTimeoutMs = 3000) => {
        return this.sendHttpRequest(route, 'POST', requestTimeoutMs, payload)
    }

    /**
     * Send a HTTP PUT request
     * @param route The route to PUT to.
     * @param payload The object that will be posted.
     * @param requestTimeoutMs The request timeout in milliseconds.
     */
    public sendHttpPutRequest = async (route: string, payload: object, requestTimeoutMs = 3000) => {
        return this.sendHttpRequest(route, 'PUT', requestTimeoutMs, payload)
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
        // TODO: What do? Different event type for actual quest related messages?
        Log.debug(`${this}: ${msg}`, SystemEvent.PLAYER_MSG)
    }

    /**
     * Websocket error handler for this player
     * @param error The error thrown by the socket
     */
    private handleError(error: Error) {
        // TODO: do what. emit event? lot?
        Log.error(`${this}: ${error}`, SystemEvent.PLAYER_ERROR)
    }

    /**
     * Websocket close handler for this player
     * @param code The close code returned
     * @param reason The reason given
     */
    private handleClose(code: number, reason: string) {
        // TODO: emit event
        Log.debug(`${this}`, SystemEvent.PLAYER_DISCONNECTED)
    }

    /**
     * Send an HTTP request asynchronoushly, with a maximum response timeout.
     * @param route The route/endpoint to query on this Player's web server.
     * @param method Which HTTP method to use.
     * @param requestTimeoutMs An optional request timeout, defaults to 3000ms.
     */
    private async sendHttpRequest(route: string, method: string, requestTimeoutMs: number = 3000, payload?: object) {
        const url = `https://${this.ip}:${PLAYER_PORT}/${route}`
        const controller = new AbortController()
        const timeout = setTimeout(
            () => controller.abort(),
            requestTimeoutMs,
        )
        const options = {
            method: method.toUpperCase(),
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.serverToken
            },
            body: payload ? JSON.stringify(payload) : undefined
        }

        try {
            const response = await fetch(url, options)
            const json = await response.json()
            const statusCode = response.status

            return { postResult: json, statusCode }
        } catch (error) {
            return { postResult: null, statusCode: null }
        } finally {
            clearTimeout(timeout)
        }
    }
}

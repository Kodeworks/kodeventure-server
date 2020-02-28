import { Request, Response } from 'express'

import { GameEngine } from "../engine/engine"
import { SystemEvent, IPlayerQuestUnlockedEvent } from '../engine/events'
import { Log } from "../logging"
import { Player } from './user'

/**
 * An interface containing essential information for registering
 * different endpoints necessary for this quest.
 */
export interface IQuestRoute {
    route: string,
    method: 'GET' | 'POST' | 'PUT',
    handler: (request: Request, response: Response) => void
}


/**
 * Config object for constructing an Experience container
 */
export interface IExperienceConfig {
    // The amount of XP gained every successful challenge
    successXp: number
    // The amount of XP lost every failed challenge
    failXp: number
    // The total number of times XP can be gained
    maxSuccess: number
    // The total number of times XP can be lost
    maxFail: number
    // The maximum number of iterations before the quest is consideres failed
    maxIterations: number
}


/**
 * Experience score tracking container.
 * Takes a gain value and a loss value, which is how much xp will be gained or lost
 * when a Player fails or succeeds in responding to a challenge.
 * There is a cap to how much loss or gain can be achieved. The quest is completed
 * when there is no more positive xp to be gained, even if there is more left to
 * be lost.
 */
export class Experience {
    // Score tracking
    private successXp: number
    private failXp: number
    private maxSuccess: number
    private maxFail: number
    private iterations: number
    private maxIterations: number

    // Internal stats counters tracking how many successes and failures the player has
    private successCount: number
    private failCount: number

    /**
     * Construct a quest experience container.
     *
     * @param successXp The number of experience points the player gains each successful challenge
     * @param failXp The number of experience points the player loses each failed challenge
     * @param maxSuccess The max number of times XP can be gained. Quest is complete when no more XP can be gained. Positive number.
     * @param maxFail The max number of times XP can be lost. Must be a negative number.
     * @param maxIterations The maximum number of iterations before the quest is considered failed.
     */
    constructor(successXp: number, failXp: number, maxSuccess: number, maxFail: number, maxIterations: number) {
        if (successXp <= 0) throw new Error('Gain value must be positive')
        if (failXp > 0) throw new Error('Loss value must be 0 or negative')

        this.successXp = successXp
        this.failXp = failXp
        this.maxSuccess = maxSuccess
        this.maxFail = maxFail
        this.maxIterations = maxIterations
        this.successCount = 0
        this.failCount = 0
        this.iterations = 0
    }

    public gain(): number {
        this.iterations++

        if (this.maxSuccess <= 0) return 0

        this.maxSuccess
        this.successCount++

        return this.successXp
    }

    public lose(): number {
        this.iterations++

        if (this.maxFail <= 0) return 0

        this.maxFail--
        this.failCount++

        return this.failXp
    }

    public get stats(): [number, number, number] {
        return [this.successCount, this.failCount, this.iterations]
    }

    /**
     * Whether or not there is more XP to be gained (if quest is complete or not)
     */
    public get completed(): boolean {
        return this.maxSuccess <= 0 || this.iterations >= this.maxIterations
    }
}


/**
 * Base class for creating a Kodeventure quest
 */
export abstract class Quest {
    // The config parameters for the XP points given or lost in this quest
    private xpConfig: IExperienceConfig

    // A reference to the game engine this quest is registered to
    protected engine: GameEngine
    // The set of players that have unlocked this quest
    protected players: Map<string, Player>
    // The XP registry for each player that has unlocked this quest
    protected xp: Map<Player, Experience>

    // The quest route serves as an identifier for the quest. If this quest is available for
    // the player, a HTTP GET to the baseRoute of this quest should return the description of
    // this quest. Without a leading /
    public abstract baseRoute: string
    // The description of this quest, or some hints, or just some witty information if the user
    // should figure it out for themselves.
    public abstract description: string
    // Whether or not this is a starter quest, and could be given from the questmaster endpoint
    public abstract starterQuest: boolean

    /**
     * Construct a quest object
     * @param engine The game engine this quest is registered to
     */
    constructor(engine: GameEngine, xpConfig: IExperienceConfig) {
        this.engine = engine
        this.players = new Map()
        this.xp = new Map()
        this.xpConfig = xpConfig

        this.subscribeToGameEvents()
    }

    /**
     * Get an array of quest route objects containing a route,
     * the request method, and the request handler for the route.
     * This property is referenced when registering this quest
     * to the game engine, and updating the web server with
     * routes. The baseRoute will be prefixed to each route in
     * the returned array when registered in the web server.
     */
    public abstract get routes(): IQuestRoute[]

    /**
     * Check whether or not a player has access to this quest.
     * @param player A Player object
     */
    public hasAccess(player: Player): boolean {
        return this.players.has(player.userToken)
    }

    /**
     * Text representation of this Quest object
     */
    public toString(): string {
        return `${this.baseRoute} (${this.description})`
    }

    /**
     * Handler method that will be invoked when a new player has unlocked this quest.
     * When this method is invoked, the player is already registered in this.players
     * @param player A Player object
     */
    protected abstract async handleNewPlayer(player: Player): Promise<void>

    /**
     * Validates an incoming HTTP request, by checking that there is a Player associated with the token
     * and that the Player has access to this quest. Returns the Player object if everything is OK, null otherwise.
     * @param req Express.js request object
     */
    protected authorize(req: Request): Player | null {
        const player = this.engine.getPlayer(req.headers.authorization)

        if (!player || !this.hasAccess(player)) return null

        return player
    }

    /**
     * Configure subscriptions to all relevant game events
     */
    private subscribeToGameEvents() {
        this.engine.on(SystemEvent.PLAYER_QUEST_UNLOCKED, (data: IPlayerQuestUnlockedEvent) => {
            this.players.set(data.player.userToken, data.player)

            // Create and set up an XP container for this player, so the quest can keep track of its state
            const xpContainer = new Experience(
                this.xpConfig.successXp,
                this.xpConfig.failXp,
                this.xpConfig.maxSuccess,
                this.xpConfig.maxFail,
                this.xpConfig.maxIterations
            )
            this.xp.set(data.player, xpContainer)

            this.handleNewPlayer(data.player)
        })
    }
}


/**
 * Example quest implementation as reference or for testing
 */
export class ExampleQuest extends Quest {
    // This is a starter quest, meaning it can be unlocked via the questmaster
    public starterQuest: boolean = true
    // Base route will be prefixed to all IQuestRoutes in this.routes (without leading /)
    public baseRoute: string = 'example-quest'
    // Description will be shown when requesting HTTP GET to the baseRoute
    public description: string = 'Static computer science trivia'

    constructor(engine: GameEngine) {
        super(engine, {
            successXp: 4,
            failXp: -2,
            maxSuccess: 10,
            maxFail: 5,
            maxIterations: 20
        })
    }

    /**
     * Event handler for event received when a Player has unlocked this quest
     * @param player A Player object
     */
    public async handleNewPlayer(player: Player): Promise<void> {
        Log.debug(`${player} unlocked ${this}`, SystemEvent.PLAYER_QUEST_UNLOCKED)

        player.notify(`You have unlocked ${this}, a challenge awaits!`)

        this.startPeriodicTask(player)
    }

    /**
     * The custom routes for this quest that the used has to call in order to solve the quest
     */
    public get routes(): IQuestRoute[] {
        return []
    }

    /**
     * Example implementation of a quest challenge against the Player's web server
     * @param player A Player object
     */
    public async startPeriodicTask(player: Player): Promise<void> {
        // Get the Player XP tracker object
        const xp = this.xp.get(player)

        // TODO: Wrap this stuff and put it in the upcoming task scheduler
        const challengePlayer = async () => {
            const postResult = await player.sendHttpPostRequest('my-simple-quest', {message: 'Who invented C++?'});

            Log.debug(`${player} ${JSON.stringify(postResult)}`, SystemEvent.PLAYER_QUEST_RESPONSE);

            // Needs more validation, don't want to call method if answer is a number for instance
            if (postResult && postResult.answer && postResult.answer.toLowerCase() === 'bjarne stroustrup') {
                player.addScore(xp.gain())
            } else {
                player.addScore(xp.lose())
                player.notify(`You are failing the ${this.baseRoute} quest, step it up! Lost 2 points.`)
            }

            console.log(xp.stats)

            if (!xp.completed) {
                // 20s intervals
                setTimeout(challengePlayer, 2000)
            } else {
                const [ success, fail, total ] = xp.stats

                player.notify(`Quest ${this.baseRoute} complete! You scored ${success} success, ${fail} fails (${total} total)`)

                if (fail > 3) {
                    player.addTitle('Noobman 9000')
                }
            }
        }

        challengePlayer()
    }
}
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
 * Base class for creating a Kodeventure quest
 */
export abstract class Quest {
    // A reference to the game engine this quest is registered to
    protected engine: GameEngine
    // The set of players that have unlocked this quest
    protected players: Map<string, Player>

    // The quest route serves as an identifier for the quest. If this quest is available for
    // the player, a HTTP GET to the baseRoute of this quest should return the description of
    // this quest.
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
    constructor(engine: GameEngine) {
        this.engine = engine
        this.players = new Map()

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
        return `Quest<${this.baseRoute}>[${this.description.slice(0, 40)}]`
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
    // Base route will be prefixed to all IQuestRoutes in this.routes
    public baseRoute: string = '/example-quest'
    // Description will be shown when requesting HTTP GET to the baseRoute
    public description: string = 'Some say, that bits should be left shifted by 4'

    constructor(engine: GameEngine) {
        super(engine)
    }

    /**
     * Event handler for event received when a Player has unlocked this quest
     * @param player A Player object
     */
    public async handleNewPlayer(player: Player): Promise<void> {
        Log.debug(`${player} unlocked ${this}`, SystemEvent.PLAYER_QUEST_UNLOCKED)

        this.startPeriodicTask(player)
    }

    /**
     * The custom routes for this quest that the used has to call in order to solve the quest
     */
    public get routes(): IQuestRoute[] {
        return [
            {
                route: '/part-one',
                method: 'POST',
                handler: this.exampleCustomQuestHandler
            }
        ]
    }

    /**
     * Example implementation of a quest challenge against the Player's web server
     * @param player A Player object
     */
    public async startPeriodicTask(player: Player): Promise<void> {
        // Set a max number of runs before we're done
        let iterations = 0
        let totalIterations = 10
        let success = 0
        let fail = 0

        // TODO: Wrap this stuff and put it in the upcoming task scheduler
        const challengePlayer = async () => {
            const postResult = await player.sendHttpPostRequest('my-simple-quest', {message: 'Who invented C++?'});

            Log.debug(`${player} ${JSON.stringify(postResult)}`, SystemEvent.PLAYER_QUEST_RESPONSE);

            // Needs more validation, don't want to call method if answer is a number for instance
            if (postResult && postResult.answer && postResult.answer.toLowerCase() === 'bjarne stroustrup') {
                player.addScore(4)
                success++
            } else {
                player.addScore(-2)
                player.notify(`You are failing the ${this.baseRoute} quest, step it up! Lost 2 points.`)
                fail++
            }

            if (iterations++ < totalIterations) {
                // 20s intervals
                setTimeout(challengePlayer, 20000)
            } else {
                player.notify(`Quest ${this.baseRoute} complete! You scored ${success}/${totalIterations}`)

                if (fail > 5) {
                    player.addTitle('Noobman 9000')
                }
            }
        }

        challengePlayer()
    }

    /**
     * Example quest handle where the Player must post something in order to solve the quest
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public exampleCustomQuestHandler(req: Request, res: Response) {
        // Ensure that the player exists and has access to this quest
        const player = this.authorize(req)

        if (!player) {
            res.status(403)
            res.json({ type: SystemEvent.PLAYER_ERROR, data: { msg: "You do not have access to this secret domain" }})
        } else {
            // if (req.body.message === 'correct_answer') doStuff()
            // else
            res.json({ msg: `Hello ${player.name}, are you feeling frisky?` })
        }
    }
}
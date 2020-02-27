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
    handler: (request: any, response: any) => void
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
        return `Quest<${this.baseRoute}>[${this.description.slice(0, 50)}]`
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
    protected authorize(req: any): Player | null {
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
     * 
     * @param player 
     */
    public async handleNewPlayer(player: Player): Promise<void> {
        Log.debug(`Player ${player} unlocked quest ${this}`)

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
                handler: this.exampleCustomQuestHandle
            }
        ]
    }

    /**
     * Example implementation of a quest challenge against the Player
     * @param player A Player object
     */
    public async startPeriodicTask(player: Player): Promise<void> {
        // TODO: Wrap this stuff and put it in the upcoming task scheduler
        const challengePlayer = async () => {
            const getResult = await player.sendHttpGetRequest('my-simple-quest');
            Log.debug(`[HTTP GET RESULT] ${JSON.stringify(getResult)}`);
    
            const postResult = await player.sendHttpPostRequest('my-simple-quest', {message: 'Who invented C++?'});
            Log.debug(`[HTTP POST RESULT] ${JSON.stringify(postResult)}`);
    
            // Needs more validation, don't want to call method if answer is a number for instance
            if (postResult && postResult.answer && postResult.answer.toLowerCase() === 'bjarne stroustrup') {
                player.addScore(4)
            } else {
                player.addScore(-2)
            }
    
            const putResult = await player.sendHttpPutRequest('my-simple-quest', {message: 'Who likes chili cheese best in the whole world?'});
            Log.debug(`[HTTP PUT RESULT] ${JSON.stringify(putResult)}`);
    
            // Needs more validation, don't want to call method if answer is a number for instance
            if (postResult && postResult.answer && postResult.answer.toLowerCase() === 'tri') {
                player.addScore(5)
            } else {
                player.addScore(-3)
            }

            // 20s intervals
            setTimeout(challengePlayer, 20000)
        }

        challengePlayer()
    }

    /**
     * Example quest handle where the Player must post something in order to solve the quest
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public exampleCustomQuestHandle(req: any, res: any) {
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
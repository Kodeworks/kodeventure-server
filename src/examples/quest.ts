import { GameEngine } from '../engine/engine'
import { SystemEvent } from '../engine/events'
import { Log } from '../logging'
import { Player } from '../models/user'
import { IQuestRoute, Quest } from '../models/quest'


/**
 * Example quest implementation as reference or for testing.
 * 
 * This quest sends a HTTP POST challenge to the Player every 3 seconds, with a json payload with a message
 * that asks for the name of the inventor of C++.
 * 
 * The quest challenges the /my-example-quest route on the Player's web server, and he/she needs to implement
 * it and respond with the correct answer.
 * 
 * The base class needs some information to help our with tracking experience.
 * 
 * successXp is how much the player XP score increases every time he/she succeeds with a correct answer to the challenge
 * failXp is how much player XP score decreases every time he/she fails to respond or give correct answer
 * maxSuccess is how many times a positive XP gain can be obtained in the quest. When no more is left the quest is completed.
 * maxFail is how many times a negative XP loss can be inflicted in the quest. When no more is left, a score of 0 is given.
 * maxIterations is the maximum number of times the quest challenge should be sent before the quest is considered completed.
 *
 * starterQuest indicates if this quest is an entry quest, that can be handed out by the questmaster endpoint of the game engine
 * baseRoute is the unique identifier / route of this quest, must be a valid url fragment i.e "some-endpoint"
 * description is a short description, hint or just a witty comment associated with this quest.
 */
export class ExampleQuest extends Quest {
    // This is a starter quest, meaning it can be unlocked via the questmaster
    public starterQuest: boolean = true
    // The minimum score required to unlock this quest from the questmaster
    public minimumScoreRequirement = 0
    // Base route will be prefixed to all IQuestRoutes in this.routes (without leading /)
    public baseRoute: string = 'example-quest'
    // Description will be shown when requesting HTTP GET to the baseRoute
    public description: string = 'Static computer science trivia'

    // Challenge every 25 seconds
    private interval: number = 25000

    constructor(engine: GameEngine) {
        super(engine, {
            successXp: 2,
            failXp: -1,
            maxSuccess: 15,
            maxFail: 15,
            maxIterations: 40
        })
    }

    /**
     * Event handler for event received when a Player has unlocked this quest.
     * Invoked from the base class whenever a new Player has unlocked this quest.
     * @param player A Player object
     */
    public async handleNewPlayer(player: Player): Promise<void> {
        await this.startPeriodicTask(player)
    }

    /**
     * The custom routes for this quest that the Player has to call in order to solve the quest.
     * These are optional and should only be specified if part of the quest involves that the user
     * also should query the server as part of the quest.
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

        const question = 'Who invented C++?'
        const answer = 'bjarne stroustrup'

        // Schedule our periodic challenge to the Player
        const task = this.engine.scheduler.schedulePeriodic(async () => {
            try {
                const { postResult } = await player.sendHttpPostRequest(this.name, { msg: question })

                if (postResult && typeof postResult.answer === "string" && postResult.answer.toLowerCase() === answer) {
                    player.addScore(xp.gain())
                } else {
                    player.addScore(xp.lose())

                    player.notify(`You are failing the ${this.baseRoute} quest, step it up! Lost 2 points.`)
                }

                if (xp.completed) {
                    const [ success, fail, total ] = xp.stats

                    if (fail > 3) {
                        player.addTitle('Noobman 9000')
                    }

                    // Cleanup
                    this.completeForPlayer(player)
                    this.engine.scheduler.cancel(task)
                }
            } catch (e) {
                Log.error(e.message, SystemEvent.PLAYER_QUEST_RESPONSE)
            }
        }, this.interval)
    }
}
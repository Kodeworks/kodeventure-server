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
    // Base route will be prefixed to all IQuestRoutes in this.routes (without leading /)
    public baseRoute: string = 'example-quest'
    // Description will be shown when requesting HTTP GET to the baseRoute
    public description: string = 'Static computer science trivia'

    private interval: number = 3000 // Challenge every 3 seconds

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
     * Event handler for event received when a Player has unlocked this quest.
     * Invoked from the base class whenever a new Player has unlocked this quest.
     * @param player A Player object
     */
    public async handleNewPlayer(player: Player): Promise<void> {
        Log.debug(`${player} unlocked ${this}`, SystemEvent.PLAYER_QUEST_UNLOCKED)

        player.notify(`You have unlocked ${this}, a challenge awaits!`)

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

        // Schedule our periodic challenge to the Player
        const task = this.engine.scheduler.schedulePeriodic(async () => {
            const postResult = await player.sendHttpPostRequest('my-simple-quest', {message: 'Who invented C++?'});

            Log.debug(`${player} ${JSON.stringify(postResult)}`, SystemEvent.PLAYER_QUEST_RESPONSE);

            // The validation here should be better ofc, but works for this example
            if (postResult && postResult.answer && postResult.answer.toLowerCase() === 'bjarne stroustrup') {
                player.addScore(xp.gain())
            } else {
                player.addScore(xp.lose())

                player.notify(`You are failing the ${this.baseRoute} quest, step it up! Lost 2 points.`)
            }

            if (xp.completed) {
                const [ success, fail, total ] = xp.stats
    
                player.notify(`Quest ${this.baseRoute} complete! You scored ${success} success, ${fail} fails (${total} total)`)
    
                if (fail > 3) {
                    player.addTitle('Noobman 9000')
                }

                this.engine.scheduler.cancel(task)
            }
        }, this.interval)
    }
}
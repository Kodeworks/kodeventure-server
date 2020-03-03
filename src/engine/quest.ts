import { GameEngine } from './engine'
import { SystemEvent } from './events'
import { Log } from '../logging'
import { Player } from '../models/user'
import { IQuestRoute, Quest } from '../models/quest'


/**
 * Entry level quest that is unlocked a few seconds after the game starts.
 * Introduces the player to the QuestMaster upon completion.
 */
export class StarterQuest extends Quest {
    public starterQuest: boolean = true
    public baseRoute: string = 'hello-world'
    public description: string = "A simple warmup quest"

    // Challenge every 20 seconds
    private interval: number = 20000

    constructor(engine: GameEngine) {
        super(engine, {
            successXp: 1,
            failXp: 0,
            maxSuccess: 5,
            maxFail: 0,
            maxIterations: 60   // 20 minutes to get it working should be enough
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
     * The challenge
     * @param player A Player object
     */
    public async startPeriodicTask(player: Player): Promise<void> {
        // Get the Player XP tracker object
        const xp = this.xp.get(player)

        // Schedule our periodic challenge to the Player
        const task = this.engine.scheduler.schedulePeriodic(async () => {
            try {
                const postResult = await player.sendHttpPostRequest('hello-world', { msg: 'hello' })

                Log.debug(`${player} ${JSON.stringify(postResult)}`, SystemEvent.PLAYER_QUEST_RESPONSE)

                // Check that we have the correct structure and type
                const hasAnswer = postResult && postResult.answer && typeof postResult.answer === 'string'

                // The validation here should be better ofc, but works for this example
                if (hasAnswer && postResult.answer.toLowerCase() === 'world') {
                    player.addScore(xp.gain())
                    player.notify('Great! You figured it out! Keep responding and your quest should be completed in no time!')
                } else {
                    player.addScore(xp.lose())
                    player.notify(`You are failing the ${this.name} quest. If I say Hello, what could you possibly respond in your "answer" field?`)
                }

                if (xp.completed) {
                    // Necessary cleanup
                    this.completeForPlayer(player)
                    this.engine.scheduler.cancel(task)

                    player.notify('Alright, you are warmed up and ready to dive into some more challenging quests.')
                    player.notify('Send a HTTP "GET /questmaster" request to the server in order to start a new random starter quest. Good Luck!')
                    player.notify('Remember to set your player token in the "Authorization" header.')
                }
            } catch (e) {
                Log.error(`${this.name}: ${e.message}`, SystemEvent.PLAYER_QUEST_RESPONSE)
            }
        }, this.interval)
    }
}
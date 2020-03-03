import { Request, Response } from 'express'

import { GameEngine } from '../engine/engine'
import { Log } from '../logging'
import { Player } from '../models/user'
import { Quest } from '../models/quest'


/**
 * Modern Fisher-Yates in-place O(n) shuffle
 * @param items An array of elements
 */
const fisherYatesShuffle = (items: any[]) => {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i)

        const tmp = items[i]
        items[i] = items[j]
        items[j] = tmp
    }
}


/**
 * Controller for the /questmaster endpoint
 */
export class QuestMasterController {
    private engine: GameEngine

    /**
     * Construct a QuestMasterController
     * @param engine A reference to the game engine this questmaster should serve
     */
    constructor(engine: GameEngine) {
        this.engine = engine

        Log.debug('Constructed QuestMaster', 'qm')
    }

    /**
     * Get a random starter quest that is not active or completed for the given Player
     * @param player A Player object
     */
    public getRandomStarterQuest(player: Player): Quest | null | undefined {
        try {
            const starterQuests = this.engine.getStarterQuests()

            fisherYatesShuffle(starterQuests)

            let q = starterQuests.pop()

            // Find a quest the player has not yet completed or already has active
            while (player.hasCompletedQuest(q.name) || player.hasActiveQuest(q.name)) {
                if (!q) break
                q = starterQuests.pop()
            }

            if (!q) {
                Log.warning(`Player ${player} exhausted all starter quests`, 'qm')

                return null
            }

            return q
        } catch (e) {
            Log.error(`Unhandled error: ${e}`, 'qm')
        }
    }

    /**
     * Request the unlock of a new random starter quest
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public request(req: Request, res: Response) {
        let payload

        if (!req.headers.authorization) {
            res.status(400)

            payload = {
                'status': 400,
                'error': 'You are missing the Authorization header'
            }

            const ip = req.connection.remoteAddress

            Log.debug(`QuestMaster received request without Authorization header from ${ip}`, 'qm')
        } else {
            const player = this.engine.getPlayer(req.headers.authorization)

            if (!player) {
                payload = {
                    'status': 500,
                    'error': 'The questmaster suffers from dementia and cannot find any more starter quests!'
                }

                Log.warning(`QuestMaster received request for unknown token "${req.headers.authorization}"`, 'qm')
            } else {
                const quest = this.getRandomStarterQuest(player)

                if (quest) {
                    payload = {
                        'status': 200,
                        'msg': 'The questmaster has found some strange device underneath his circuitboards.'
                    }
                } else {
                    res.status(500)

                    if (quest === null) {
                        payload = {
                            'status': 500,
                            'error': 'The questmaster suffers from dementia and cannot find any more starter quests!'
                        }
                    } else {
                        payload = {
                            'status': 500,
                            'error': 'The questmaster is drunk, please contact the dungeon masters!'
                        }
                    }
                }
            }
        }

        res.send(JSON.stringify(payload))
    }
}

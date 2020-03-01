import { Request, Response } from 'express'

import { authorize } from './auth'
import { GameEngine } from '../engine/engine'
import { SystemEvent } from 'engine/events'


/**
 * Basic game state controller to start/pause/unpause/stop the game through CLI or admin page
 */
export class GameController {
    private engine: GameEngine

    /**
     * Construct a GameController
     * @param engine The GameEngine this controller should operate on
     */
    constructor(engine: GameEngine) {
        this.engine = engine
    }

    /**
     * Start the game
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public start(req: Request, res: Response) {
        if (authorize(req, res)) {
            try {
                this.engine.start()
                res.send()
            } catch (e) {
                res.status(403)
                res.send({'status': 401, 'error': e})
            }
        }
    }

    /**
     * Pause the game
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public pause(req: Request, res: Response) {
        if (authorize(req, res)) {
            try {
                this.engine.pause()
                res.send()
            } catch (e) {
                res.status(403)
                res.send({'status': 401, 'error': e})
            }
        }
    }

    /**
     * Unpause the game
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public unpause(req: Request, res: Response) {
        if (authorize(req, res)) {
            try {
                this.engine.unpause()
                res.send()
            } catch (e) {
                res.status(403)
                res.send({'status': 401, 'error': e})
            }
        }
    }

    /**
     * Stop (end) the game
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public stop(req: Request, res: Response) {
        if (authorize(req, res)) {
            try {
                this.engine.stop()
                res.send()
            } catch (e) {
                res.status(403)
                res.send({'status': 401, 'error': e})
            }
        }
    }
}
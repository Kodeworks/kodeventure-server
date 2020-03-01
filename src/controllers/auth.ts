import { Request, Response } from 'express'

import { DUNGEON_MASTER_KEY } from '../config'

/**
 * Simple authorization function that checks if the Authorization header contains the correct admin token.
 * Sends a 401 if not valid. Returns true if authorized, false otherwise.
 * @param req Express.js request object
 * @param res Express.js response object
 */
export const authorize = (req: Request, res: Response): boolean => {
    if (req.headers.authorization !== DUNGEON_MASTER_KEY) {
        res.status(401)
        res.send({'status': 401, 'error': 'These are not the droids you are looking for'})
        return false
    } else {
        return true
    }
}

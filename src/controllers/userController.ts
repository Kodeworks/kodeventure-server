import { Request, Response } from 'express'

import { UserDatabaseModel } from '../models/user'
import { DUNGEON_MASTER_KEY } from '../config'

/**
 * Simple authorization function that checks if the Authorization header contains the correct admin token.
 * Sends a 401 if not valid. Returns true if authorized, false otherwise.
 * @param req Express.js request object
 * @param res Express.js response object
 */
const authorize = (req: Request, res: Response): boolean => {
    if (req.headers.authorization !== DUNGEON_MASTER_KEY) {
        res.status(401)
        res.send({'status': 401, 'error': 'These are not the droids you are looking for'})
        return false
    } else {
        return true
    }
}


/**
 * Basic user controller used for listing or adding new users through CLI or admin page
 */
export class UserController {
    /**
     * Lists all users in database.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public getUsers(req: Request, res: Response) {
        if (authorize(req, res)) {
            UserDatabaseModel.find({}, (error, users) => {
                if (error) {
                    res.send(error)
                }

                res.json(users)
            })
        }
    }

    /**
     * Add a new user to the database.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public addNewUser(req: Request, res: Response) {
        if (authorize(req, res)) {
            let newUser = new UserDatabaseModel(req.body)

            newUser.save((error, user) => {
                if (error) {
                    res.send(error)
                }

                res.json(user)
            })
        }
    }
}
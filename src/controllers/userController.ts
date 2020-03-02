import { Request, Response } from 'express'

import { authorize } from './auth'
import { UserDatabaseModel } from '../models/user'


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

    /**
     * Reset all players stats.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public resetAllStats(req: Request, res: Response) {
        if (authorize(req, res)) {
            UserDatabaseModel.updateMany({}, { $set: { titles: [], loot: [], score: 0 } })
        }
    }

}

import { Request, Response } from 'express'
import path from 'path'

import { authorize } from './auth'
import { UserDatabaseModel } from '../models/user'
import { Log } from '../logging'
import { SystemEvent } from '../engine/events'


/**
 * Basic user controller used for listing or adding new users through CLI or admin page
 */
export class UserController {

    /**
     * Resolve index of GET /user.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public getIndex(req: Request, res: Response) {
        res.sendFile(path.resolve(__dirname, '..', 'public', 'user', 'user.html'))
    }

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
        const user = { ...req.body, score: 0, titles: [], loot: [], activeQuests: [], completedQuests: [] }
        let newUser = new UserDatabaseModel(user)

        newUser.save((error, user) => {
            if (error) {
                res.send(error)
            }

            res.json(user)
        })
    }

    /**
     * Reset all players stats.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public resetAllStats(req: Request, res: Response) {
        if (authorize(req, res)) {
            UserDatabaseModel.update({}, {$set: { titles: [], loot: [], score: 0, activeQuests: [], completedQuests: [] } }, { multi: true })
            res.send()
        }
    }

    /**
     * Reset single player stats.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public resetPlayerStats(req: Request, res: Response) {
        if (authorize(req, res)) {
            const playerId = req.params.id
            UserDatabaseModel.update({ _id: playerId }, { $set: { titles: [], loot: [], score: 0, activeQuests: [], completedQuests: [] } })
            res.send()
        }
    }

    /**
     * Delete all users.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public deleteAllUsers(req: Request, res: Response) {
        if (authorize(req, res)) {
            UserDatabaseModel.deleteMany({}, error => {
                if (error) Log.error(`Error deleting users: ${error}`, SystemEvent.DB_DELETE_ERROR)
            })
            res.send()
        }
    }

    /**
     * Delete user by ID.
     * @param req Express.js request object
     * @param res Express.js response object
     */
    public deleteUser(req: Request, res: Response) {
        if (authorize(req, res)) {
            const playerId = req.params.id
            UserDatabaseModel.deleteOne({ _id: playerId })
            res.send()
        }
    }

}

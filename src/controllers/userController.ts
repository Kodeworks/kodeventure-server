import { Request, Response } from 'express'

import { UserDatabaseModel } from '../models/user'
import { DUNGEON_MASTER_KEY } from '../config'

const authorize = (req: Request, res: Response): boolean => {
    if (req.headers.authorization !== DUNGEON_MASTER_KEY) {
        res.status(403)
        res.send({'status': 403, 'error': 'These are not the droids you are looking for'})
        return false
    } else {
        return true
    }
}

export class UserController {
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
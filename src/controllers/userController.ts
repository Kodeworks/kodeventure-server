import { Request, Response } from 'express'

import { UserDatabaseModel } from '../models/user'

export class UserController {
    public getUsers(req: Request, res: Response) {
        UserDatabaseModel.find({}, (error, users) => {
            if (error) {
                res.send(error)
            }

            res.json(users)
        })
    }

    public addNewUser(req: Request, res: Response) {
        let newUser = new UserDatabaseModel(req.body)

        newUser.save((error, user) => {
            if (error) {
                res.send(error)
            }

            res.json(user)
        })
    }

}
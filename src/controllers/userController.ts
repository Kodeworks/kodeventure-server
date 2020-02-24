import mongoose from 'mongoose'
import { User } from '../models/user'
import { Request, Response } from 'express'

const UserModel = mongoose.model('User', User)

export class UserController {

    public getUsers(req: Request, res: Response) {
        UserModel.find({}, (error, users) => {
            if (error) {
                res.send(error)
            }

            res.json(users)
        })
    }

    public addNewUser(req: Request, res: Response) {
        let newUser = new UserModel(req.body)

        newUser.save((error, user) => {
            if (error) {
                res.send(error)
            }

            res.json(user)
        })
    }

}
import { Request, Response } from 'express'
import { UserController } from './controllers/userController'

export class Routes {

    public userController: UserController = new UserController()
    
    public routes(app): void {
        
        app.route('/') 
        .get((req: Request, res: Response) => {
            res.status(200).send({
                message: 'I GOT you'
            })
        })


        app.route('/user').post(this.userController.addNewUser)
        app.route('/users').get(this.userController.getUsers)

    }

}
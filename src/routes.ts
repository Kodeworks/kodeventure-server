import { Application } from 'express'
import { UserController } from './controllers/userController'
import { ScoreboardController } from './controllers/scoreboardController'

export class Routes {

    public scoreboardController: ScoreboardController = new ScoreboardController()
    public userController: UserController = new UserController()

    public routes(app: Application): void {

        app.get('/', this.scoreboardController.getIndex)
        app.route('/user').post(this.userController.addNewUser)
        app.route('/users').get(this.userController.getUsers)
    }

}
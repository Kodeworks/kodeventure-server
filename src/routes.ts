import { Application, Request, Response } from 'express'

import { CertController } from './controllers/certController'
import { UserController } from './controllers/userController'
import { ScoreboardController } from './controllers/scoreboardController'
import { Log } from './logging'

export class Routes {
    private app: Application
    private routes: Set<string>

    public certController: CertController = new CertController()
    public scoreboardController: ScoreboardController = new ScoreboardController()
    public userController: UserController = new UserController()

    constructor(app: Application) {
        this.app = app
        this.routes = new Set()

        // Serve scoreboard on main page
        this.get('/', this.scoreboardController.getIndex)

        // Admin endpoints
        this.post('/user', this.userController.addNewUser)
        this.get('/users', this.userController.getUsers)

        // Certificate creation endpoint
        this.post('/cert', this.certController.createPlayerCert.bind(this.certController))
    }

    /**
     * Register a request handler for GET requests at the specified route.
     * @param route The route to register
     * @param handler The request handler for the endpoiunt
     */
    public get(route: string, handler: (req: Request, res: Response) => void) {
        if (this.routes.has(route)) {
            return Log.error(`Could not add route ${route} as it is already registered`, "routes")
        }

        this.app.get(route, handler)
        this.routes.add(`GET ${route}`)
    }

    /**
     * Register a request handler for POST requests at the specified route.
     * @param route The route to register
     * @param handler The request handler for the endpoiunt
     */
    public post(route: string, handler: (req: Request, res: Response) => void) {
        if (this.routes.has(route)) {
            return Log.error(`Could not add route ${route} as it is already registered`, "routes")
        }

        this.app.post(route, handler)
        this.routes.add(`POST ${route}`)
    }

    /**
     * Register a request handler for PUT requests at the specified route.
     * @param route The route to register
     * @param handler The request handler for the endpoiunt
     */
    public put(route: string, handler: (req: Request, res: Response) => void) {
        if (this.routes.has(route)) {
            return Log.error(`Could not add route ${route} as it is already registered`, "routes")
        }

        this.app.put(route, handler)
        this.routes.add(`PUT ${route}`)
    }
}
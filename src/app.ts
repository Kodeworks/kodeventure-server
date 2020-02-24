import  express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'

import { Routes } from './routes'


class App {

    public app: express.Application
    public routes: Routes = new Routes()

    public mongoUrl: string = 'mongodb://localhost/kodeventure'

    constructor() {
        this.app = express()
        
        this.config()
        this.mongoSetup()

        this.routes.routes(this.app)
    }

    private config(): void {
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: false }))
    }

    private mongoSetup(): void {
        mongoose.connect(this.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    }

}

export default new App().app
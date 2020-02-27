import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import path from 'path'

import { GameEngine } from './engine/engine'
import { Log } from './logging'
import { Routes } from './routes'
import { WebSocketHandler } from './websocket'


/**
 * Main application class for the Kodeventure programming RPG
 */
export default class Kodeventure {
    private engine: GameEngine
    private mongoUrl: string = 'mongodb://localhost/kodeventure'
    private httpServer: http.Server
    private routes: Routes
    private webapp: express.Application
    private ws: WebSocketHandler

    /**
     * Construct a Kodeventure instance
     */
    constructor() {
        this.webapp = express()
        this.routes = new Routes(this.webapp)
        this.engine = new GameEngine(this.routes)
        this.httpServer = http.createServer(this.webapp)
        this.ws = new WebSocketHandler(this.httpServer, this.engine)

        this.config()
        this.mongoSetup()
    }

    public listen(host: string, port: number) {
        this.httpServer.listen(port, host, () => {
            Log.info(`Server started listening on ${host}:${port}`)
        })
    }

    /**
     * Configure express.js
     */
    private config(): void {
        this.webapp.use(bodyParser.json())
        this.webapp.use(bodyParser.urlencoded({ extended: false }))
        this.webapp.use(express.static(path.resolve(__dirname, 'public')))
    }

    /**
     * Configure the mongoose connection to MongoDB.
     *
     * The connection options are explicitly set to handle deprecation warnings by the default options.
     */
    private mongoSetup(): void {
        mongoose.Promise = global.Promise
        mongoose.connect(this.mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        })
    }
}
import bodyParser from 'body-parser'
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
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
        // Express app and MongoDB
        this.webapp = express()
        this.config()
        this.mongoSetup()

        // Load self signed certificate
        const cert = this.loadCertificate()

        // Game configuration, web server and websockets
        this.routes = new Routes(this.webapp)
        this.engine = new GameEngine(this.routes)
        this.httpServer = https.createServer(cert, this.webapp)
        this.ws = new WebSocketHandler(this.httpServer, this.engine)

        Log.debug(`Constructed Kodeventure`, 'server')
    }

    /**
     * Start the application web server
     * @param host The hostname to bind to
     * @param port The port to bind to
     */
    public listen(host: string, port: number) {
        this.httpServer.listen(port, host, () => {
            Log.info(`Started listening on ${host}:${port} using game engine ${this.engine}`, 'server')
        })
    }

    private loadCertificate(): { cert: string, key: string } {
        Log.info(`Loading SSL certificate from server.key and server.crt`, 'server')

        const privateKey  = fs.readFileSync('server.key', 'utf8');
        const certificate = fs.readFileSync('server.crt', 'utf8');

        return { key: privateKey, cert: certificate }
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
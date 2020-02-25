import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import path from 'path'
import WebSocket from 'ws'

import { Routes } from './routes'
import { Player } from './models/user'


class Kodeventure {
    /**
     * Main application class for the Kodeventure programming RPG
     */

    public app: express.Application
    public httpServer: http.Server
    public mongoUrl: string = 'mongodb://localhost/kodeventure'
    public routes: Routes = new Routes()
    public wss: WebSocket.Server

    /**
     * Construct a Kodeventure instance
     */
    constructor() {
        this.app = express()
        this.httpServer = http.createServer(this.app)
        this.wss = new WebSocket.Server({ server: this.httpServer, path: '/ws' })

        this.config()
        this.mongoSetup()
        this.webSocketSetup()

        this.routes.routes(this.app)
    }

    /**
     * Configure express.js
     */
    private config(): void {
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(express.static(path.resolve(__dirname, 'public')))
    }

    /**
     * Configure websocket server
     */
    private webSocketSetup(): void {
        // Inject a user with token "abc" into database by curling to database:
        // curl -H "Content-Type: application/json" -X POST localhost:3001/user -d '
        // {"token": "abc", "server_token": "def", "name": "Snerk", "score": 10, "titles": [], "loot": []}'
        const testUserToken = "abc"

        // TODO: move handler code to a seperate class, wrap the socket and request to construct a user connection object to extend with additional functionality
        this.wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage) => {
            try {
                const player = await Player.get(testUserToken, request.connection.remoteAddress, request.connection.remotePort)
                console.log(`[CONNECT] ${player}`)

                ws.on('message', (msg: string) => {
                  console.log(`[MSG] (${player}): ${msg}`)
                })
            } catch {
                console.error(`[ERR] Could not find player with toke "${testUserToken}"`)
            }
        })
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

export default new Kodeventure().httpServer
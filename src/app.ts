import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import path from 'path'
import WebSocket from 'ws'

import { Routes } from './routes'


class Kodeventure {
    public app: express.Application
    public httpServer: http.Server
    public mongoUrl: string = 'mongodb://localhost/kodeventure'
    public routes: Routes = new Routes()
    public wss: WebSocket.Server

    constructor() {
        this.app = express()
        this.httpServer = http.createServer(this.app)
        this.wss = new WebSocket.Server({ server: this.httpServer, path: '/ws' })

        this.config()
        this.mongoSetup()
        this.webSocketSetup()

        this.routes.routes(this.app)
    }

    private config(): void {
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(express.static(path.resolve(__dirname, 'public')))
    }

    private webSocketSetup(): void {
        // TODO: move handler code to a seperate class, wrap the socket and request to construct a user connection object to extend with additional functionality
        this.wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
            console.log(`connected: ${request.connection.remoteAddress}:${request.connection.remotePort}`)
            ws.on('message', (msg: string) => {
              console.log(`received: ${msg} from ${request.connection.remoteAddress}:${request.connection.remotePort}`)
            })
        })
    }

    private mongoSetup(): void {
        mongoose.Promise = global.Promise
        mongoose.connect(this.mongoUrl)
    }
}

export default new Kodeventure().httpServer
import bodyParser from 'body-parser'
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import mongoose from 'mongoose'
import path from 'path'

import { GameEngine } from './engine/engine'
import { SIMULATION_TOTAL_PLAYERS, SIMULATION_QUESTS_PER_PLAYER, LOG_LEVEL } from './config'
import { SystemEvent } from './engine/events'
import { StarterQuest } from './engine/quest'
import { Log } from './logging'
import quests from './quests'
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
    constructor(simulation: boolean = false) {
        Log.level = LOG_LEVEL

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

        this.loadQuests()

        Log.debug(`Constructed Kodeventure`, 'server')

        // Start simulation if stress testing
        if (simulation) this.engine.simulate(SIMULATION_TOTAL_PLAYERS, SIMULATION_QUESTS_PER_PLAYER)
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

    /**
     * Load the starter quest.
     * Load all quests defined in index.ts in the quests package
     */
    private loadQuests() {
        Log.info('Loading quests', 'server')

        // You can change what starter quest is active here if you like, for development purposes
        const starterQuest = new StarterQuest(this.engine)

        this.engine.registerQuest(starterQuest)

        // Upon game start, schedule unlocking the starter quest for all players
        this.engine.on(SystemEvent.GAME_STARTED, data => {
            let jitter = Math.random() * 200

            for (const player of this.engine.players) {
                // Unlock starter quest after 5 seconds
                this.engine.scheduler.scheduleAfter(() => {
                    player.unlockQuest(starterQuest)
                }, 5000 + jitter)

                jitter += Math.random() * 200
            }
        })

        // Load all quests from the quests package (submodule)
        for (const quest of quests) {
            this.engine.registerQuest(new quest(this.engine))
        }
    }

    /**
     * Reads server.key and server.crt from disk and returns the content as a simple object
     */
    private loadCertificate(): { cert: string, key: string } {
        Log.info(`Loading SSL certificate from server.key and server.crt`, 'server')

        const privateKeyPath = path.resolve(__dirname, '..', 'server.key')
        const certificatePath = path.resolve(__dirname, '..', 'server.crt')

        const privateKey  = fs.readFileSync(privateKeyPath, 'utf8');
        const certificate = fs.readFileSync(certificatePath, 'utf8');

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
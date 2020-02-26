import { IncomingMessage, Server } from 'http'
import url from 'url'
import WebSocket from 'ws'

import { GameEngine } from './engine/engine'
import { IPlayerConnectedEvent, SystemEvent, IPlayerScoreEvent, IPlayerTitleEvent, IPlayerLootObtainedEvent, IPlayerLootUsedEvent } from './engine/events'
import { Log } from './logging'

/**
 * Kodeventure websocket handler
 */
export class WebSocketHandler {
    private engine: GameEngine
    private players: WebSocket.Server
    private scoreBoard: WebSocket.Server

    /**
     * Construct a web socket handler for the provided http.Server instance
     *
     * @param server An instance of http.Server
     */
    constructor(server: Server, engine: GameEngine) {
        this.engine = engine

        this.players = new WebSocket.Server({ noServer: true })
        this.scoreBoard = new WebSocket.Server({ noServer: true })

        this.configureServers(server)
    }

    /**
     * Configure a dispatcher on the http server instance that handles upgrade requests
     * and dispatches to the correct websocket server based on which endpoint is being acessed.
     * @param server A http.Server instance
     */
    private configureServers(server: Server) {
        // Attach a dispatcher dealing with upgrade requests
        server.on('upgrade', (request, socket, head) => {
            const pathname = url.parse(request.url).pathname

            // Handler for regular player server
            if (pathname === '/ws') {
                this.players.handleUpgrade(request, socket, head, ws => {
                    this.players.emit('connection', ws, request);
                })
            // Handler for scoreboard server
            } else if (pathname === '/scoreboard/ws') {
                this.scoreBoard.handleUpgrade(request, socket, head, ws => {
                    this.scoreBoard.emit('connection', ws, request);
                })
            // Discard upgrade requests for all other endpoints
            } else {
                socket.destroy()
            }
        })

        // Configure players websocket server event handlers
        this.players.on('connection', this.handlePlayersConnection.bind(this))
        this.players.on('close', this.handlePlayersClose.bind(this))
        this.players.on('error', this.handlePlayersError.bind(this))

        // Configure scoreboard websocket server event handlers
        this.scoreBoard.on('connection', this.handleScoreBoardConnection.bind(this))
        this.scoreBoard.on('close', this.handleScoreBoardClose.bind(this))
        this.scoreBoard.on('error', this.handleScoreBoardError.bind(this))

        // Subscribe to relevant player events that should be broadcast to the scoreboard
        this.engine.on(SystemEvent.PLAYER_SCORE, data => this.broadcastScoreBoardEvent(SystemEvent.PLAYER_SCORE, data))
        this.engine.on(SystemEvent.PLAYER_TITLE, data => this.broadcastScoreBoardEvent(SystemEvent.PLAYER_TITLE, data))
        this.engine.on(SystemEvent.PLAYER_LOOT_OBTAINED, data => this.broadcastScoreBoardEvent(SystemEvent.PLAYER_LOOT_OBTAINED, data))
        this.engine.on(SystemEvent.PLAYER_LOOT_USED, data => this.broadcastScoreBoardEvent(SystemEvent.PLAYER_LOOT_USED, data))
        
    }

    /**
     * Broadcast a message to all clients connected to the scoreboard
     * @param event The event to broadcast
     * @param data The unserialized data to send
     */
    private broadcastScoreBoardEvent(event: SystemEvent, data: any) {
        // Make sure we strip the player of private information before broadcasting
        if (data.player) data.player = data.player.toJson()

        const envelope = { type: event, data: data }

        this.scoreBoard.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(envelope));
            }
        })
    }

    /**
     * Server event handler for "connection" events
     * @param ws The WebSocket object for the active connection
     * @param request The HTTP request object with the associated connection
     */
    private handlePlayersConnection(ws: WebSocket, request: IncomingMessage) {
        // Ensure the request has the user token in the Authorization header.
        if (!request.headers.authorization) {
            const payload = JSON.stringify({
                type: SystemEvent.GAME_MESSAGE,
                data: 'Could not find a valid "Authorization" header in websocket request. Please set it to your player token.'
            })

            ws.send(payload)

            const source = `${request.connection.remoteAddress}:${request.connection.remotePort}`
            Log.warning(`Missing auth header from ${source}`, "ws")

            return ws.close()
        }

        const e: IPlayerConnectedEvent = {
            ws: ws,
            ip: request.connection.remoteAddress,
            port: request.connection.remotePort,
            token: request.headers.authorization
        }

        this.engine.emit(SystemEvent.PLAYER_CONNECTED, e)
    }

    /**
     * Server event handler for "close" events
     */
    private handlePlayersClose() {
        Log.error(`Players server closed`, "ws")
    }

    /**
     * Server event handler for "error" events
     * @param error The error that was thrown
     */
    private handlePlayersError(error: Error) {
        Log.error(`Players server error: ${error}`, "ws")
    }

    /**
     * Server event handler for "connection" events
     * @param ws The WebSocket object for the active connection
     * @param request The HTTP request object with the associated connection
     */
    private handleScoreBoardConnection(ws: WebSocket, request: IncomingMessage) {
        const source = `${request.connection.remoteAddress}:${request.connection.remotePort}`

        Log.debug(`New connection from: ${source}`, "scoreboard")
    }

    /**
     * Server event handler for "close" events
     */
    private handleScoreBoardClose() {
        Log.error(`Score board server closed`, "scoreboard")
    }

    /**
     * Server event handler for "error" events
     * @param error The error that was thrown
     */
    private handleScoreBoardError(error: Error) {
        Log.error(`Score board server error: ${error}`, "scoreboard")
    }
}
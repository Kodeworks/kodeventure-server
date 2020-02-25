import { IncomingMessage, Server } from 'http'
import WebSocket from 'ws'

import { GameEngine } from './engine/engine'
import { IPlayerConnectedEvent, SystemEvent } from './engine/events'

/**
 * Kodeventure websocket handler
 */
export class WebSocketHandler {
    private engine: GameEngine
    private wss: WebSocket.Server

    /**
     * Construct a web socket handler for the provided http.Server instance
     *
     * @param server An instance of http.Server
     */
    constructor(server: Server, engine: GameEngine) {
        this.wss = new WebSocket.Server({ server: server, path: '/ws' })
        this.engine = engine

        // Configure websocket server event handlers
        this.wss.on('connection', this.handleConnection.bind(this))
        this.wss.on('close', this.handleClose.bind(this))
        this.wss.on('error', this.handleError.bind(this))
    }

    /**
     * Server event handler for "connection" events
     * @param ws The WebSocket object for the active connection
     * @param request The HTTP request object with the associated connection
     */
    private handleConnection(ws: WebSocket, request: IncomingMessage) {
        if (!request.headers.authorization) {
            ws.send(JSON.stringify({
                type: SystemEvent.GAME_MESSAGE,
                token: null,
                msg: 'Could not find a valid "Authorization" header in websocket request. Please set it to your player token.'
            }))
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
    private handleClose() {
        console.error(`[WSS] WebSocket server closed`)
    }

    /**
     * Server event handler for "error" events
     * @param error The error that was thrown
     */
    private handleError(error: Error) {
        console.error(`[ERR] WebSocket server error: ${error}`)
    }
}
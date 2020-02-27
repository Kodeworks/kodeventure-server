import { IncomingMessage, Server } from 'http'
import url from 'url'
import WebSocket from 'ws'

import { GameEngine } from './engine/engine'
import { SystemEvent, IPlayerConnectingEvent } from './engine/events'
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
    this.configureEventStreams()
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
  }

  /**
   * Set up event bindings to and from the different websocket servers and the game engine
   */
  private configureEventStreams() {
    // Subscribe to relevant player events that should be broadcast to the scoreboard
    this.engine.on(SystemEvent.PLAYER_CONNECTED, data => this.broadcastToScoreBoard(SystemEvent.PLAYER_CONNECTED, data))
    this.engine.on(SystemEvent.PLAYER_SCORE, data => this.broadcastToScoreBoard(SystemEvent.PLAYER_SCORE, data))
    this.engine.on(SystemEvent.PLAYER_TITLE, data => this.broadcastToScoreBoard(SystemEvent.PLAYER_TITLE, data))
    this.engine.on(SystemEvent.PLAYER_LOOT_OBTAINED, data => this.broadcastToScoreBoard(SystemEvent.PLAYER_LOOT_OBTAINED, data))
    this.engine.on(SystemEvent.PLAYER_LOOT_USED, data => this.broadcastToScoreBoard(SystemEvent.PLAYER_LOOT_USED, data))
  }

  /**
   * Broadcast a message to all players connected to the server
   * @param event The event to broadcast
   * @param data The unserialized data to send
   */
  public broadcastToPlayers(event: SystemEvent, data: any) {
    this.broadcast(this.players, event, data)
  }

  /**
   * Broadcast a message to all clients connected to the scoreboard
   * @param event The event to broadcast
   * @param data The unserialized data to send
   */
  private broadcastToScoreBoard(event: SystemEvent, data: any) {
    this.broadcast(this.scoreBoard, event, data)
  }

  /**
   * Broadcast a message to all clients connected to provided server. Will sanitize
   * any "player" property in the event payload.
   * @param server The websocket server instance to broadcast to
   * @param event The event to broadcast
   * @param data The unserialized data to send
   */
  private broadcast(server: WebSocket.Server, event: SystemEvent, data: any) {
    // Make sure we strip the player of private information before broadcasting
    if (data.player) {
      data.player = data.player.sanitize()
    }

    const payload = JSON.stringify({ type: event, data: data })

    for (const client of server.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Server event handler for "connection" events
   * @param ws The WebSocket object for the active connection
   * @param request The HTTP request object with the associated connection
   */
  private handlePlayersConnection(ws: WebSocket, request: IncomingMessage) {
    const data: IPlayerConnectingEvent = {
      ws: ws,
      ip: request.connection.remoteAddress,
      port: request.connection.remotePort,
      token: request.headers.authorization
    }

    // Ensure the request has the user token in the Authorization header.
    if (!request.headers.authorization) {
      const response = JSON.stringify({
        type: SystemEvent.PLAYER_ERROR,
        data: {
          msg: 'Could not find a valid "Authorization" header in websocket request. Please set it to your player token.'
        }
      })

      ws.send(response)
      ws.close()

      const failureData = { ...data, error: 'Missing or invalid Authorization header' }

      this.engine.emit(SystemEvent.PLAYER_CONNECT_FAILED, failureData)
    } else {
      this.engine.emit(SystemEvent.PLAYER_CONNECTING, data)
    }

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
    for (const player of this.engine.players) {
      const envelope = {
        type: SystemEvent.PLAYER_SCORE,
        data: {
          player: player.sanitize()
        }
      }

      ws.send(JSON.stringify(envelope))
    }
  }

  /**
   * Server event handler for "close" events
   */
  private handleScoreBoardClose() {
    Log.error(`Score board server closed`, "ws")
  }

  /**
   * Server event handler for "error" events
   * @param error The error that was thrown
   */
  private handleScoreBoardError(error: Error) {
    Log.error(`Score board server error: ${error}`, "ws")
  }
}

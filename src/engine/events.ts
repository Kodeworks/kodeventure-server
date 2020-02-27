import WebSocket from 'ws'

import { Player } from '../models/user';

/**
 * Complete enumeration of all events in the game engine
 */
export const enum SystemEvent {
    // General game events
    GAME_STARTED = "game_started",
    GAME_PAUSED = "game_paused",
    GAME_ENDED = "game_ended",
    GAME_MESSAGE = "game_message",

    // User related events
    PLAYER_CONNECTING = "player_connecting",
    PLAYER_CONNECT_FAILED = "player_connect_failed",
    PLAYER_CONNECTED = "player_connected",
    PLAYER_RECONNECTED = "player_reconnected",
    PLAYER_DISCONNECTED = "player_disconnected",
    PLAYER_MSG = "player_msg",
    PLAYER_SCORE = "player_score",
    PLAYER_TITLE = "player_title",
    PLAYER_LOOT_OBTAINED = "player_loot_obtained",
    PLAYER_LOOT_USED = "player_loot_used",
    PLAYER_QUEST_UNLOCKED = "player_quest_unlocked",
    PLAYER_QUEST_REQUEST = "player_quest_request",
    PLAYER_QUEST_RESPONSE = "player_quest_response",

    // Player related errors and warnings
    PLAYER_ERROR = "player_error",
    PLAYER_WARNING = "player_warning"
}

// Interface mixins

/**
 * Base interface where the player object should be part of the event payload
 * @param player The associated Player instance
 */
interface IPlayerEvent {
    player: Player
}

// Payload declarations

/**
 * Event data structure for game messages
 */
export interface IGameMessageEvent {
    msg: string
}

/**
 * Event data structure for player connected
 * @param ws The websocket socket object associated with the player connection
 * @param token The player token that was provided in the auth header
 * @param ip The IP address the player is connecting from and reachable on
 * @param port The port the player is reachable on
 */
export interface IPlayerConnectingEvent {
    ws: WebSocket
    token: string
    ip: string
    port: number
}

/**
 * Event data structure for player connected
 * @param error The error message associated with the connection failure
 */
export interface IPlayerConnectFailedEvent extends IPlayerConnectingEvent {
    error: string
}

/**
 * Event data structure for player connected
 */
export interface IPlayerConnectedEvent extends IPlayerEvent {}

/**
 * Event data structure for player reconnected
 */
export interface IPlayerReconnectedEvent extends IPlayerEvent {}

/**
 * Event data structure for player disconnected
 */
export interface IPlayerDisconnectedEvent extends IPlayerEvent {}

/**
 * Event data structure for player message
 * @param msg The message received from the player
 */
export interface IPlayerMsgEvent extends IPlayerEvent {
    msg: string
}

/**
 * Event data structure for player score changed
 * @param change The diff in score
 */
export interface IPlayerScoreEvent extends IPlayerEvent {
    change: number
}

/**
 * Event data structure for player title aquired
 * @param newTitle The newly claimed title
 */
export interface IPlayerTitleEvent extends IPlayerEvent {
    newTitle: string
}

/**
 * Event data structure for player loot obtained
 * @param loot The name of the item that was obtained
 */
export interface IPlayerLootObtainedEvent extends IPlayerEvent {
    loot: string
}

/**
 * Event data stucture for player loot used
 * @param loot The ame of the item that was consumed
 */
export interface IPlayerLootUsedEvent extends IPlayerEvent {
    loot: string
}

/**
 * Event data structure for player quest unlocked
 */
export interface IPlayerQuestUnlockedEvent extends IPlayerEvent {}

/**
 * Event data structure for player quest request
 */
export interface IPlayerQuestRequestEvent extends IPlayerEvent {}

/**
 * Event data structure for player quest response
 */
export interface IPlayerQuestResponseEvent extends IPlayerEvent {}

/**
 * Event data structure for generic user specific error
 * @param msg The error message to the player
 */
export interface IPlayerError {
    msg: string
}

/**
 * Event data structure for generic user specific warning
 * @param msg The warning message to the player
 */
export interface IPlayerWarning {
    msg: string
}

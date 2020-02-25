import WebSocket from 'ws'

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
    PLAYER_CONNECTED = "player_connected",
    PLAYER_DISCONNECTED = "player_disconnected",
    PLAYER_SCORE = "player_score_change",
    PLAYER_TITLE = "player_title",
    PLAYER_LOOT_OBTAINED = "player_loot_obtained",
    PLAYER_LOOT_USED = "player_loot_used",
    PLAYER_QUEST_UNLOCKED = "player_quest_unlocked",
    PLAYER_QUEST_REQUEST = "player_quest_request",
    PLAYER_QUEST_RESPONSE = "player_quest_response",
}

// Event payload declarations

/**
 * Event data structure for game messages
 */
export interface IGameMessageEvent {
    msg: string
}

/**
 * Event data structure for player connected
 */
export interface IPlayerConnectedEvent {
    ws: WebSocket
    token: string
    ip: string
    port: number
}

/**
 * Event data structure for player disconnected
 */
export interface IPlayerDisconnectedEvent {

}

/**
 * Event data structure for player score changed
 */
export interface IPlayerScoreEvent {

}

/**
 * Event data structure for player title aquired
 */
export interface IPlayerTitleEvent {

}

/**
 * Event data structure for player loot obtained
 */
export interface IPlayerLootObtainedEvent {

}

/**
 * Event data stucture for player loot used
 */
export interface IPlayerLootUsedEvent {

}

/**
 * Event data structure for player quest unlocked
 */
export interface IPlayerQuestUnlockedEvent {

}

/**
 * Event data structure for player quest request
 */
export interface IPlayerQuestRequestEvent {

}

/**
 * Event data structure for player quest response
 */
export interface IPlayerQuestResponseEvent {

}

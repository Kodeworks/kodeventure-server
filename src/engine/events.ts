/**
 * Complete enumeration of all events in the game engine
 */
const enum SystemEvent {
    // General game events
    GAME_STARTED = "game_started",
    GAME_MESSAGE = "game_message",
    GAME_ENDED = "game_ended",
    // User related events
    USER_CONNECTED = "user_connected",
    USER_DISCONNECTED = "user_disconnected",
    USER_SCORE = "user_score_change",
    USER_TITLE = "user_title",
    USER_LOOT_OBTAINED = "user_loot_obtained",
    USER_LOOT_USED = "user_loot_used",
    USER_QUEST_UNLOCKED = "user_quest_unlocked",
    USER_QUEST_REQUEST = "user_quest_request",
    USER_QUEST_RESPONSE = "user_quest_response",
}
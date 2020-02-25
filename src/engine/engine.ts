import { Quest } from "models/quest"

export class GameEngine {
    private quests: Set<Quest>

    constructor() {
        this.quests = new Set()
    }

    public registerQuest(quest: Quest) {
        this.quests.add(quest)
    }
}
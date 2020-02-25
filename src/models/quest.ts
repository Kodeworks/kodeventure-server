import { GameEngine } from "../engine/engine"

export abstract class Quest {
    private engine: GameEngine

    constructor(engine: GameEngine) {
        this.engine = engine
        this.engine.registerQuest(this)
    }

    public abstract async handleEvent(eventType: any, data?: any): Promise<void>

    public abstract get id(): string

    public abstract get description(): string
}
import mongoose, { Document, Schema } from 'mongoose'

const UserSchema: Schema = new Schema({
    token: { type: String, unique: true, required: true },
    server_token: { type: String, unique: true, required: true },
    name: { type: String, required: true, unique: true },
    score:  { type: Number, required: true },
    titles: { type: [String], required: true },
    loot: { type: [String], required: true }
})

export interface IUser extends Document {
    token: string
    server_token: string
    name: string
    score: number
    titles: string[]
    loot: string[]
}

export const UserDatabaseModel = mongoose.model<IUser>('User', UserSchema)

export class Player {
    user: IUser
    ip: string
    port: number

    private constructor(user: IUser, ip: string, port: number) {
        this.user = user
        this.ip = ip
        this.port = port
    }

    public toString(): string {
        return `Player<${this.user.name}>[${this.ip}:${this.port}] Score: ${this.user.score}`
    }

    /**
     * Fetch the player corresponding to the given token from the database and return a Player object with
     * the current connection information.
     *
     * @param token The unique player token
     * @param ip The IP address the player is connecting from
     * @param port The port the player is running his/her web server on
     */
    public static async get(token: string, ip: string, port: number): Promise<Player> {
        const user = await UserDatabaseModel.findOne({'token': token})

        if (!user) {
            throw Error(`Failed to fetch user with token "${token}"`)
        }

        return new Player(user, ip, port)
    }
}
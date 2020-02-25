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
    token: String
    server_token: String
    name: String
    score: Number
    titles: String[]
    loot: String[]
}

export const UserDatabaseModel = mongoose.model<IUser>('User', UserSchema)

export class Player {
    user: IUser
    ip: string
    port: number

    constructor(token: string, ip: string, port: number) {
        UserDatabaseModel.findOne({'token': token}, (err, user) => {
            if (err) {
                // TODO: Error handling / logging / what
                throw Error(err)
            } else {
                this.user = user
            }
        })

        this.ip = ip
        this.port = port
    }
}
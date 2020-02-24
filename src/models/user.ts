import mongoose from 'mongoose'

export const User = new mongoose.Schema({
    token: { type: String },
    server_token: { type: String },
    name: { type: String },
    score:  { type: Number },
    titles: { type: [String] },
    loot: { type: [String] }
});
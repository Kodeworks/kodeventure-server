import path from 'path'
import { Request, Response } from 'express'

export class ScoreboardController {

    public getIndex(req: Request, res: Response) {
        res.sendFile(path.resolve(__dirname, '..', 'public', 'scoreboard', 'scoreboard.html'))
    }

}
import Kodeventure from './app'
import { HOST, PORT } from './config'

const app = new Kodeventure()

app.listen(HOST, PORT)

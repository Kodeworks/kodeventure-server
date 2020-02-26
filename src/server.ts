import WebSocket from 'ws'
import Kodeventure from './app'

const HOSTNAME = '127.0.0.1'
const PORT = 3001

const app = new Kodeventure()
app.listen(HOSTNAME, PORT)
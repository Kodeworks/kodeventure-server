import WebSocket from 'ws'
import Kodeventure from './app'

const HOSTNAME = '127.0.0.1'
const PORT = 3001

const app = new Kodeventure()
app.listen(HOSTNAME, PORT)

// TODO: Move this test code to the client-repo for now
// Test having a client connection to the ws server
const headers = {'Authorization': 'abc'}
const ws = new WebSocket('ws://localhost:3001/ws', { headers: headers })
ws.on('open', () => {
  setTimeout(() => ws.send('halla Tri, skjera'), 500)
})
ws.on('message', msg => {
  console.log(msg)
})
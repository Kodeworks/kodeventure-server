import app from './app'

const HOSTNAME = '127.0.0.1'
const PORT = 3001

app.listen(PORT, HOSTNAME, () => {
    console.log('Server listenting on port ', PORT);
})

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  setTimeout(() => ws.send('halla Tri, skjera'), 500)
});
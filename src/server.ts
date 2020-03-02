import Kodeventure from './app'
import { HOST, PORT } from './config'

// Disable all TLS verification since we're dealing with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const app = new Kodeventure()

app.listen(HOST, PORT)

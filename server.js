const express = require('express')
const { createServer } = require('http')
const WebSocket = require('ws')

const app = express()
const server = createServer(app)
const port = process.env.PORT || 10000

const wss = new WebSocket.Server({ server, path: '/ws' })

// Called for a connection whenever client responds with a pong
function heartbeat() {
  this.isAlive = true
}

wss.on('connection', function connection(ws) {
  ws.isAlive = true
  ws.on('error', console.error)
  ws.on('pong', heartbeat)

  ws.on('message', (message) => {
    console.log('Received:', message.toString())
    ws.send('Hello over WebSocket!')
  })
})

// Ping all connected clients every 30 seconds
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    // Close connections that failed to "pong" the previous ping
    if (ws.isAlive === false) return ws.terminate()

    ws.isAlive = false
    ws.ping()
  })
}, 30000)

// Standard shutdown logic
wss.on('close', function close() {
  clearInterval(interval)
})

server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
const express = require('express')
const { createServer } = require('http')
const WebSocket = require('ws')

const app = express()
const server = createServer(app)
const port = process.env.PORT || 10000

// Serves WebSocket connections at /ws (any path is fine)
const wss = new WebSocket.Server({ server, path: '/ws' })

// HTTP routes
app.get('/', (req, res) => {
  res.send('Hello over HTTP!')
})

// WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  ws.on('message', (message) => {
    console.log('Received:', message.toString())
    ws.send(`Hello over WebSocket!`)
  })
})

server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
import {WebSocketServer} from 'ws';
const server = new WebSocketServer({
    port: 8081
});
server.on('connection', (socket) => {
    console.log("Client connected");
    socket.on('message', (message) => {
        console.log("Received: "+message);
        socket.send("Server:"+message);
    });
    socket.on('close', () => {
        console.log("Client discconnected");
    })
});
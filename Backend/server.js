const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.get("/", (req, res) => {
    res.send("Socket.IO server is running!");
});

io.on("connection", (socket) => {
  console.log("User connected: "+socket.id);

  socket.on("chat message", (msg) => {
    if (msg == "How are you doing?") {
        io.emit("chat message", "Good, how are you?");
    } else {
      io.emit("chat message", msg);
    }
  });

  socket.on("heartbeat", (msg) => {
    io.emit("heartbeat", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(process.env.PORT || 3000);

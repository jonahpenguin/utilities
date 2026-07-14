const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

let dvdMainVisits = 0;

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

  socket.on("buzz", (msg) => {
    console.log(msg+" buzzed in at "+new Date());
  });
  
  socket.on("heartbeat", (msg) => {
    io.emit("heartbeat", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("dvdMain", (msg) => {
    if (msg == "visitCountReq") {
      io.emit("dvdMain", dvdMainVisits);
    }
    if (msg.includes("visitCountSet")) {
      let str = msg.split("visitCountSet").join("");
      dvdMainVisits = parseInt(str);
      console.log("Set dvdMain visits to "+dvdMainVisits);
    }
    if (msg == "incCount") {
      dvdMainVisits++;
      console.log("Updated dvdMain visit counter to "+dvdMainVisits);
    }
  });
});

server.listen(process.env.PORT || 3000);

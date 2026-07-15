const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

let dvdMainVisits = 0;
let chatHistory = [];

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let adminPass = 0;
setInterval(() => {
  adminPass = Math.floor(Math.random() * 1000000);
  console.log("Updated system (ID: "+adminPass+")");
}, 60000);

app.get("/", (req, res) => {
    res.send("Socket.IO server is running!");
});

io.on("connection", (socket) => {
  console.log("User connected: "+socket.id);

  socket.on("verifyAdmin", (msg) => {
    if (parseInt(msg) === adminPass) {
      io.emit("verifiedAdmin", socket.id);
    }
  });
  
  socket.on("chat message", (msg) => {
    if (msg == "How are you doing?") {
        io.emit("chat message", "Good, how are you?");
    } else {
      io.emit("chat message", msg);
    }
  });

  // Buzzer.html
  socket.on("buzz", (msg) => {
    console.log(msg+" buzzed in at "+new Date());
  });
  
  socket.on("heartbeat", (msg) => {
    io.emit("heartbeat", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });


  // dvdMain
  socket.on("dvdMain", (msg) => {
    if (msg == "visitCountReq") {
      let d = new Date();
      io.emit("dvdMain", d.getHours()+":"+d.getMinutes()+" on "+d.getMonth()+"/"+d.getDate()+"): "+dvdMainVisits);
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

  // betterChat.html
  function getConvoHTML() {
    let chCopy = chatHistory;
    chCopy.reverse();
    return chCopy.join("<br><br>");
  }
  socket.on("chatMsg", (msg) => {
    let d = new Date();
    chatHistory.push("<span title="+d.getHours()+":"+d.getMinutes()+">"+msg+"</span>");
    let output = getConvoHTML();
    io.emit("chatContent", output);
  });

  socket.on("chatReset", (msg) => {
    if (msg == atob('MDc0NzQ=')) {
      chatHistory = [];
      io.emit("chatResetResult", "Success");
    } else {
      io.emit("chatResetResult", "Fail");
  });

  // Below should only be used at start
socket.on("chatRequest", () => {
  let output = getConvoHTML();
  io.emit("chatContent", output);
});

  
  // chat.html - old
  // let chatUsers = [];
  // socket.on("chatCheck", (msg) => {
  //   let passed = true;
  //   for (let i = 0;i<chatUsers.length;i++) {
  //     if (chatUsers[i].name == msg) {
  //       passed = false;
  //       break;
  //     }
  //   }

  //   // Testing
  //   passed = true
    
  //   if (!passed) {
  //     io.emit("chatCheckRes", "fail");
  //   } else {
  //     io.emit("chatCheckRes", "pass");
  //     chatUsers.push(
  //       {
  //         name: msg,
  //         id: socket.id,
  //         lastHeartbeat: 0
  //       }
  //     );
  //     console.log(chatUsers);
  //   }
  // });
  
  // socket.on("chatHeartbeat", () => {
  //   let wasSuccessful = false;
  //   for (let i = 0; i<chatUsers.length; i++) {
  //     if (chatUsers[i].id == socket.id) {
  //       // Note to self: Date.now() is in ms
  //       chatUsers[i].lastHeartbeat = Date.now();
  //       wasSuccessful = true;
  //     }
  //   }
  //   if (!wasSuccessful) {
  //     console.log("**umm tried to heartbeat but ID not found in chatUsers");
  //     io.emit("serverError", "User was disconnected for more than 5 seconds, so their entry was removed from Online Users");
  //   }
  // });
  
  // // Clear offline users
  // setInterval(() => {
  //   let t = Date.now();
  //   for (let i = 0;i<chatUsers.length;i++) {
  //     if (chatUsers[i].lastHeartbeat - t >= 5000) {
  //       // Assume offline and remove
  //       chatUsers.splice(i, 1);
  //     }
  //   }
  // }, 5000);
  
  // socket.on("chatRequest", (msg) => {
  //   if (msg == "onlineUsers") {
  //     io.emit("userList", chatUsers);
  //   }
  // });
  
  // socket.on("chatSend", (msg) => {
  //   let dest = msg.split("!)$&")[0];
  //   if (chatUsers[dest]) {
  //     dest = chatUsers[dest].id;
  //   }
  //   let content = msg.split("!)$&")[1];
  //   io.to(dest).emit("chatMsg", content+"!)$&"+socket.id);
  // });
  
  
});


server.listen(process.env.PORT || 3000);

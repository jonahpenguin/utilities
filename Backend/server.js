const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

let dvdMainVisits = 0;
let chatHistory = [];
let onlineChatUsers = [];
let onlineHSUsers = [];
let lastChatHeartbeat = [];
let hsGames = [
  {
    roomID: 123456,
    maxPlayers: 10,
    mapID: 3,
    players: []
  }
];

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});


// Unused for now; I need to make a page specificly for admin stuff
// let adminPass = 0;
// setInterval(() => {
//   adminPass = Math.floor(Math.random() * 1000000);
//   console.log("Updated system (ID: "+adminPass+")");
// }, 60000);

app.get("/", (req, res) => {
    res.send("<script>location.replace('https://utilities-8tvg.onrender.com/renderIndex.html')</script>");
});
let restartIncoming = false;
app.get("/status", (req, res) => {
  res.send(
    "Server is running! Surely that means everything is going according to plan...nothing I code ever breaks :)<br><br><a href='https://utilities-8tvg.onrender.com/renderIndex.html'>Go to Index</a>" +
    "<br><br>" +
    (restartIncoming ? "<u><i><b style='color:red;'>Server restart incoming; connection will drop soon</b></i></u>" : "")
  )
});



io.on("connection", (socket) => {
  console.log("User connected: "+socket.id);

  socket.on("HSplayerUpdate", (msg) => {
    // roomID,username,animation,mapID,x,y,isHider
    msg = msg.split(",");
    let roomID = parseInt(msg[0]);
    if (roomID == -1) {
      return;
    }
    let playerName = msg[1];
    let animation = msg[2];
    let mapID = parseInt(msg[3]);
    let x = parseFloat(msg[4]);
    let y = parseFloat(msg[5]);
    let isHider = (msg[6] == "true" ? true : false);
    let gameIndex = hsGames.map(function (e){return e.roomID;}).indexOf(roomID);
    let playerIndex = hsGames[gameIndex].players.map(function (e) {return e.username;}).indexOf(playerName);
    if (playerIndex == -1) {
      hsGames[gameIndex].players.push(
        {
          username: playerName,
          x: x,
          y: y,
          mapID: mapID,
          animation: animation,
          isHider: isHider
        }
      );
    } else {
      hsGames[gameIndex].players[playerIndex] = {
          username: playerName,
          x: x,
          y: y,
          mapID: mapID,
          animation: animation,
          isHider: isHider
      }
    }
    function getGameData(roomID) {
      // roomID,other data...&username,mapID,animation,x,y,isHider&
      // Section before the first & is all room-related data, afterwards it is player data divided by more &s
      let output = roomID;
      for (let player in hsGames[roomID].players) {
        output += "&"+player.username+","+player.mapID+","+player.animation+","+player.x+","+player.y+","+player.isHider
      }
      return output;
    }
    io.emit("HSupdate", getGameData(roomID));
  });
  
  socket.on("nameCheck", (msg) => {
    if (onlineHSUsers.includes(msg)) {
      socket.emit("nameCheckResult", "fail");
    } else {
      socket.emit("nameCheckResult", "pass");
    }
  });
  
  socket.on("restartIncoming", (msg) => {
    if (parseInt(msg) == 1) {
      restartIncoming = true;
    } else if (parseInt(msg) == 0) {
      restartIncoming = false;
    }
  });
  
  socket.on("verifyAdmin", (msg) => {
    if (msg === atob('MDc0NzQ=')) {
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
      io.emit("dvdMain", (d.getHours()-4)+":"+d.getMinutes()+" on "+(d.getMonth()-1)+"/"+d.getDate()+"): "+dvdMainVisits);
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
    let newArr = [...chatHistory].reverse();
    let output = "";
    for (let i = 0;i<newArr.length;i++) {
      output += "<span id='msg"+i+"'>"+newArr[i]+"</span><br><br>";
    }
    return output;
  }
  socket.on("chatMsg", (msg) => {
    let d = new Date();
    
    chatHistory.push("<span title="+(d.getHours()-4)+":"+d.getMinutes()+":"+d.getSeconds()+">"+msg+"</span>");
    let output = getConvoHTML();
    io.emit("chatContent", output+"(^#^#"+onlineChatUsers.join("+"));
  });

  socket.on("chatDeleteMsg", (msg) => {
    let verifCode = msg.split("&")[0];
    let msgID = msg.split("&")[1];
    if (verifCode == atob("MDc0NzQ=")) {
      chatHistory.splice(msgID, 1);
      let output = getConvoHTML();
      io.emit("chatContent", output+"(^#^#"+onlineChatUsers.join("+"));
    }
  });

  socket.on("chatHeartbeat", (msg) => {
    if (!onlineChatUsers.includes(msg)) {
      let index = onlineChatUsers.push(msg);
      lastChatHeartbeat[index] = Date.now();
      let output = getConvoHTML();
      io.emit("chatContent", output+"(^#^#"+onlineChatUsers.join("+"));
    } else {
      let index = onlineChatUsers.indexOf(msg);
      lastChatHeartbeat[index] = Date.now();
    }
  });
  setInterval(() => {
    for (let i = 0;i<onlineChatUsers.length;i++) {
      if (Date.now() - lastChatHeartbeat[i] >= 5000) {
        onlineChatUsers.splice(i,1);
        lastChatHeartbeat.splice(i,1);
        io.emit("chatContent", getConvoHTML()+"(^#^#"+onlineChatUsers.join("+"));
      }
    }
  }, 5000);

  socket.on("chatReloadRequest", (msg) => {
    if (msg == atob("MDc0NzQ=")) {
      io.emit("chatReload", msg);
    }
  });
  
  socket.on("chatReset", (msg) => {
    if (msg == atob('MDc0NzQ=')) {
      chatHistory = [];
      io.emit("chatResetResult", "Success");
    } else {
      io.emit("chatResetResult", "Fail");
    }
  });

  socket.on("chatNameRemoteUpdateRequest", (msg) => {
    io.emit("chatNameRemoteUpdate", msg);
  });
  
  // Below should only be used at start
socket.on("chatRequest", () => {
  let output = getConvoHTML();
  io.emit("chatContent", output+"(^#^#"+onlineChatUsers.join("+"));
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

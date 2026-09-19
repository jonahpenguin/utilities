const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

let dvdMainVisits = 0;
let chatHistory = [];
let onlineChatUsers = [];
let HSusers = [];
let lastChatHeartbeat = [];
let hsGames = [];

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// HS old room cleanup
setInterval(() => {
  for (let i = 0;i<hsGames.length;i++) {
    if (Date.now() - hsGames[i].roomHeartbeat >= 60000*5) {
      io.emit("HSgameExpiration", hsGames[i].roomID);
      hsGames.splice(i,1);
      console.log("HS games count update: "+hsGames.length);
    }
  }
}, 10000);

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
app.get("/hst", (req, res) => {
  res.send(
    "<script>location.replace('https://utilities-8tvg.onrender.com/HideAndSeekTag/hideAndSeekTag.html')</script>"
  )
});


io.on("connection", (socket) => {
  // console.log(socket);
  console.log("User connected: "+socket.id);

  socket.on("HSchatMsg", (msg) => {
    io.emit("HSchatMsg", msg);
  });
  
  socket.on("HSplayerListReq", (msg) => {
    msg = msg.split(",");
    let name = msg[0];
    let roomID = parseInt(msg[1]);
    if (isNaN(roomID)) {
      socket.emit("HSalert", "Invalid room ID; try leaving and re-joining");
      return;
    }
    let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (gameIndex == -1) {
      socket.emit("HSalert", "Invalid room ID; try leaving and re-joining");
      return;
    }
    if (name != hsGames[gameIndex].hostName) {
      socket.emit("HSalert", "Could not verify that you are the host. Try leaving and re-joining");
      return;
    }
    let output = '';
    for (let i = 0; i<hsGames[gameIndex].players.length;i++) {
      output += hsGames[gameIndex].players[i].username+",";
    }
    socket.emit("HSplayerListRes", output);
  });

  socket.on("HSroomClose", (msg) => {
    // roomID,name
    msg = msg.split(",");
    let roomID = parseInt(msg[0]);
    let username = msg[1];
    let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (gameIndex == -1) {
      socket.emit("HSalert", "Room not found. Try leaving and re-joining");
      return;
    }
    if (hsGames[gameIndex].hostName == username) {
      hsGames.splice(roomID, 1);
      socket.emit("HSroomCloseRes", "pass");
    } else {
      socket.emit("HSnotif", "Could not verify that you are the host. Try leaving and re-joining");
    }
  });
  
  socket.on("HSkick", (msg) => {
    for (let i = 0;i<hsGames.length;i++) {
      if (hsGames[i].players.includes(msg)) {
        let index = hsGames[i].players.indexOf(msg);
        hsGames[i].players.splice(index, 1);
        break;
      }
    }
    io.emit("HSkick", msg);
  });
  
  socket.on("HSinfoRequest", (msg) => {
    let output = "";
    msg = msg.split(",");
    let hudChoice = parseInt(msg[0]);
    let roomID = parseInt(msg[1]);
    if (isNaN(hudChoice) || isNaN(roomID)) {
      console.log("NaN in HSinfoRequest");
      return;
    }
    let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (gameIndex == -1) {
      console.log("Game not found in HSinfoRequest");
      return;
    }
    switch(hudChoice) {
      case 1:
        output = 0;
        for (let player in hsGames[gameIndex].players) {
          if (player.isHider) {
            output++;
          }
        }
        break;
      case 2:
        output = 0;
        for (let player in hsGames[gameIndex].players) {
          if (!player.isHider) {
            output++;
          }
        }
        break;
      case 3:
        output = hsGames[gameIndex].players.length;
        break;
    }
    socket.emit("HSinfoReport", output);
  });
  
  socket.on("HSroomLock", (msg) => {
    // Format: roomID,username,lock/unlock
    msg = msg.split(",");
    let roomID = parseInt(msg[0]);
    let username = msg[1];
    let lockOrUnlock = parseInt(msg[2]);
    let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (gameIndex == -1) {console.log("Line 61");return}
    if (username == hsGames[gameIndex].hostName) {
      if (lockOrUnlock == 1) {
        hsGames[gameIndex].isLocked = true;
        socket.emit("HSalert", "Locked");
      } else {
        hsGames[gameIndex].isLocked = false;
        socket.emit("HSalert", "Unlocked");
      }
    } else {
      socket.emit("HSalert", "Failed - could not verify host status");
    }
  });
  
  // socket.on("HSdisconnect", (msg) => {
  //   // This is not working, it keeps getting stuck on line 77 [see below for new solution]
  //   let name = msg.split(",")[0];
  //   let roomID = parseInt(msg.split(",")[1]);
  //   let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
  //   if (gameIndex == -1) {console.log("Line 77");return}
  //   let playerIndex = hsGames[gameIndex].players.map(function (e) {return e.username}).indexOf(name);
  //   if (playerIndex == -1) {console.log("Line 79");return}
  //   hsGames[gameIndex].players.splice(playerIndex, 1);
  //   io.emit("disconnectNotif", roomID+","+name);
  // });

  // Fact-check the following listener, it is 9:36pm so I can't guarantee that this works
  // Great news it works :D
  socket.on("disconnect", () => {
    let isDone = false;
    let index = -1;
    for (let i = 0; i<hsGames.length;i++) {
      for (let j = 0;j<hsGames[i].players.length;j++) {
        if (hsGames[i].players[j].socketID === socket.id) {
          io.emit("HSdisconnectNotif", hsGames[i].players[j].roomID+","+hsGames[i].players[j].username);
          hsGames[i].players.splice(j,1);
          isDone = true;
          index = parseInt(i);
          break;
        }
      }
      if (isDone) {break}
    }
    function getGameData(roomID) {
      // roomID,other data...&username,mapID,animation,x,y,isHider&
      // Section before the first & is all room-related data, afterwards it is player data divided by more &s
      let output = roomID;
      let gameIndex = hsGames.map(function (e){return e.roomID;}).indexOf(roomID);
      for (let i = 0; i<hsGames[gameIndex].players.length; i++) {
        output +=
          "&"+hsGames[gameIndex].players[i].username+","+hsGames[gameIndex].players[i].mapID+","+hsGames[gameIndex].players[i].animation+","+
          hsGames[gameIndex].players[i].x+","+hsGames[gameIndex].players[i].y+","+hsGames[gameIndex].players[i].isHider
      }
      return output;
    }
    if (index != -1) {
      io.emit("HSupdate", getGameData(hsGames[index].roomID));
    }
  });

  
  socket.on("HSroomCheck", (msg) => {
    let username = msg.split(",")[0];
    let roomID = parseInt(msg.split(",")[1]);
    let gameID = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (gameID != -1) {
      if (hsGames[gameID].isLocked) {
        socket.emit("HSroomFail", "Room is locked");
        return;
      }
      let playerCapReached = (hsGames[gameID].players.length >= hsGames[gameID].maxPlayers);
      if (!playerCapReached) {
        socket.emit("HSroomOkay", roomID+","+hsGames[gameID].mapID+","+(hsGames[gameID].hostName==username ? "host" : "player")+","+hsGames[gameID].isStarted);
      } else {
        socket.emit("HSroomFail", "Room is full");
      }
    } else {
      socket.emit("HSroomFail", "Room not found");
    }
  });

  socket.on("debug", (msg) => {
    // let output = eval(msg);
    // socket.emit("debugResult", output);
    console.log("debug")
  });
  
  socket.on("HSplayerUpdate", (msg) => {
    // roomID,username,animation,mapID,x,y,isHider
    msg = msg.split(",");
    let roomID = parseInt(msg[0]);
    if (roomID == -1) {
      socket.emit("HSsessionExpired", "roomID");
      return;
    }
    let playerName = msg[1];
    let animation = msg[2];
    let mapID = parseInt(msg[3]);
    let x = parseFloat(msg[4]);
    let y = parseFloat(msg[5]);
    let isHider = (msg[6] == "true" ? true : false);
    let gameIndex = hsGames.map(function (e){return e.roomID;}).indexOf(roomID);
    if (gameIndex == -1) {return}
    hsGames[gameIndex].roomHeartbeat = Date.now();
    let playerIndex = hsGames[gameIndex].players.map(function (e) {return e.username;}).indexOf(playerName);
    if (playerIndex == -1) {
      hsGames[gameIndex].players.push(
        {
          socketID: socket.id,
          username: playerName,
          x: x,
          y: y,
          mapID: mapID,
          animation: animation,
          isHider: isHider
        }
      );
      io.emit("HSplayerJoin", roomID+","+playerName);
    } else {
      hsGames[gameIndex].players[playerIndex] = {
          socketID: socket.id,
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
      for (let i = 0; i<hsGames[gameIndex].players.length; i++) {
        output +=
          "&"+hsGames[gameIndex].players[i].username+","+hsGames[gameIndex].players[i].mapID+","+hsGames[gameIndex].players[i].animation+","+
          hsGames[gameIndex].players[i].x+","+hsGames[gameIndex].players[i].y+","+hsGames[gameIndex].players[i].isHider
      }
      return output;
    }
    io.emit("HSupdate", getGameData(roomID));
    if (!hsGames[gameIndex].isStarted) {return}
    let isDone = true;
    for (let player in hsGames[gameIndex].players) {
      if (player.isHider) {
        isDone = false;
      }
    }
    if (isDone) {
      io.emit("HSgameEnd", hsGames[gameIndex].roomID);
      hsGames[gameIndex].isStarted = false;
    }
  });

  socket.on("HSroomCountCheck", () => {
    if (hsGames.length >= 10) {
      socket.emit("HSrccResult", "fail:"+hsGames.length);
    } else {
      socket.emit("HSrccResult", "pass:"+hsGames.length);
    }
  });
  
  socket.on("HSroomCreation", (msg) => {
    // Format: startMap+","+seekerCount+","+allowCamo+","+maxPlayers+","+hostName
    msg = msg.split(",");
    let roomID = Math.floor(Math.random() * 90000)+100000;
    let maxPlayers = parseInt(msg[3]);
    let mapID = parseInt(msg[0]);
    let hostName = msg[4];
    if (hostName == "" || hostName == "User") {
      socket.emit("HSroomCreateFail", "No username set. Try changing your username, or contact Admin.");
    }
    if (isNaN(mapID)) {
      socket.emit("HSroomCreateFail", "Invalid map. If this is unintentional, contact Admin.");
      return;
    }
    let seekerCount = parseInt(msg[1]);
    if (isNaN(seekerCount)) {
      socket.emit("HSroomCreateFail", "Invalid value for Seeker Count");
      return;
    }
    if (isNaN(maxPlayers)) {
      socket.emit("HSroomCreateFail", "Invalid value for Max Players");
      return;
    }
    // roomID: 123456,
    // maxPlayers: 10,
    // mapID: 3,
    // players: [],
    // isLocked: false,
    // hostName: "Jonah [Admin]",
    // roomHeartbeat: Date.now()
    hsGames.push(
      {
        roomID: roomID,
        maxPlayers: maxPlayers,
        mapID: mapID,
        isLocked: false,
        hostName: hostName,
        players: [],
        roomHeartbeat: Date.now(),
        isStarted: false,
        seekerCount: seekerCount,
        seekerReleaseTimer: 60
      }
    )
    console.log("HS games count update: "+hsGames.length);
    socket.emit("HSroomCreatePass", roomID);
  });

  socket.on("HSgameStart", (msg) => {
    // username,roomID
    msg = msg.split(",");
    let name = msg[0];
    let roomID = parseInt(msg[1]);
    if (isNaN(roomID)) {socket.emit("HSalert", "Invalid room ID; try leaving and rejoining");return;}
    let gameIndex = hsGames.map(function (e) {return e.roomID}).indexOf(roomID);
    if (hsGames[gameIndex].players.length <= hsGames[gameIndex].seekerCount) {
      socket.emit("HSalert", "Not enough players ("+hsGames[gameIndex].players.length+"/"+(hsGames[gameIndex].seekerCount+1)+")");
      return;
    }
    hsGames[gameIndex].isStarted = true;
    let indexes = [];
    let seekerNames = [];
    for (let i = 0;i<hsGames[gameIndex].players.length;i++) {
      indexes.push(i);
    }
    for (let i = 0;i<hsGames[gameIndex].seekerCount;i++) {
      console.log("indexes: "+indexes.join(","));
      let index = Math.floor(Math.random()*indexes.length);
      let nextPlayer = indexes[index];
      console.log("nextPlayer"+nextPlayer);
      seekerNames.push(hsGames[gameIndex].players[nextPlayer].username);
      indexes.splice(index, 1);
      if (indexes.length == 0) {break}
    }
    io.emit("HSstart", roomID+","+seekerNames.join("&"));
    let int = setInterval(() => {
      hsGames[gameIndex].seekerReleaseTimer--;
      if (hsGames[gameIndex].seekerReleaseTimer > 0) {
        io.emit("HStimerUpdate", roomID+","+hsGames[gameIndex].seekerReleaseTimer);
      } else {
        io.emit("HSseekerRelease", hsGames[gameIndex].roomID+","+hsGames[gameIndex].mapID);
        clearInterval(int);
      }
    }, 1000);
  });
  
  socket.on("nameCheck", (msg) => {
    if (HSusers.includes(msg)) {
      socket.emit("nameCheckRes", "fail");
    } else {
      socket.emit("nameCheckRes", "pass");
    }
  });
  socket.on("nameChange", (msg) => {
    msg = msg.split(",");
    let oldName = msg[0];
    let newName = msg[1];
    if (HSusers.includes(oldName) && oldName != "User") {
      if (HSusers.includes(newName)) {
        socket.emit("nameChangeRes", "fail");
      } else {
        let index = HSusers.indexOf(oldName);
        HSusers[index] = newName;
        console.log("HSusers update: "+HSusers);
        socket.emit("nameChangeRes", "pass,"+newName);
      }
    } else {
      HSusers.push(newName);
      socket.emit("nameChangeRes", "pass,"+newName);
      console.log("HSusers update: "+HSusers);
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
      socket.emit("verifiedAdmin", socket.id);
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
      // io.emit("dvdMain", (d.getHours()-4)+":"+d.getMinutes()+" on "+(d.getMonth()-1)+"/"+d.getDate()+"): "+dvdMainVisits);
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

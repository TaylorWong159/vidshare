const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const favicon = require('serve-favicon');

let rooms = [];

class Room {
  constructor(id) {
    this.id = id;
    this.users = [];
    this.video = {
      url: '',
      duration: 0,
      playing: false
    }
    this.messages = [`Admin: Room #${this.id} created successfully`];
  }

  toJSON() {
    let users = [];
    for (let i = 0; i < this.users.length; i++) {
      users.push(this.users[i].toJSON());
    }
    return { id: this.id, video: this.video, messages: this.messages, users: users };
  }
};
class User {
  constructor(socket, username) {
    this.socket = socket;
    this.username = username;
  }

  toJSON() {
    return this.username;
  }
}

function printRooms() {
  console.log(rooms);
}

io.on('connection', (socket) => {
  printRooms();

  socket.on('changeRoom', (data) => {
    let found = false;
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id == data.new) {
        rooms[i].users.push(new User(socket, data.username));
        found = true;
      }

      if (data.old != null && rooms[i].id == data.old) {
        for (let j = 0; j < rooms.length; j++) {
          for (let k = 0; k < rooms[j].users.length; k++) {
            if (rooms[j].users[k].socket == socket) {
              rooms[j].users.splice(k, 1);
              if (rooms[j].users.length < 1) {
                rooms.splice(j, 1);
                break;
              }
            }
          }
        }
      }
    }

    if (!found) {
      rooms.push(new Room(data.new));
      rooms[rooms.length - 1].users.push(new User(socket, data.username));
    }

    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id == data.new) {
        for (let j = 0; j < rooms[i].users.length; j++) {
          rooms[i].users[j].socket.emit('update', rooms[i].toJSON());
        }
      }
    }

    printRooms();
  });
  socket.on('message', (data) => {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id == data.id) {
        rooms[i].messages.push(`${data.username}: ${data.message}`);
        for (let j = 0; j < rooms[i].users.length; j++) {
          rooms[i].users[j].socket.emit('message', rooms[i].toJSON());
        }
      }
    }
  });
  socket.on('changeURL', (data) => {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id == data.id) {
        rooms[i].video.url = data.url;
        for (let j = 0; j < rooms[i].users.length; j++) {
          rooms[i].users[j].socket.emit('update', rooms[i].toJSON());
        }
      }
    }
    printRooms();
  });
  socket.on('seek', (data) => {
    console.log(data);
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id == data.id) {
        rooms[i].video = data.video;
        for (let j = 0; j < rooms[i].users.length; j++) {
          rooms[i].users[j].socket.emit('update', rooms[i].toJSON());
        }
      }
    }
  });
  socket.on('disconnect', () => {
    for (let i = 0; i < rooms.length; i++) {
      for (let j = 0; j < rooms[i].users.length; j++) {
        if (rooms[i].users[j].socket == socket) {
          rooms[i].users.splice(j, 1);
          if (rooms[i].users.length < 1) {
            rooms.splice(i, 1);
            break;
          } else {
            for (let k = 0; k < rooms[i].users.length; k++) {
              rooms[i].users[k].socket.emit('update', rooms[i].toJSON());
            }
          }
        }
      }
    }
    printRooms();
  });
});

http.listen(port, () => {
  console.log(`server started on port ${port}`);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/logo.ico')));

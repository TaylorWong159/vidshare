let socket;
let id;
let changeDisabled = false;
let video;
let username;
let seeking = false;

function sendMessage(message) {
  socket.emit('message', { id: id, username: username, message: message });
}
function changeRoom(room) {
  socket.emit('changeRoom', { old: id, new: room, username: username });
}
function update(data) {
  changeDisabled = true;

  id = data.id;
  console.log(data);
  $('#room-id').html(id);

  $('#users').html('Users:');
  for (let i = 0; i < data.users.length; i++) {
    $('#users').append(`<li class="user">${data.users[i]}</li>`);
  }

  $('#chat').html('');
  for (let i = 0; i < data.messages.length; i++) {
    $('#chat').append(`<li class="message">${data.messages[i]}</li>`);
  }

  video.currentTime = data.video.duration.toString();
  if (data.video.playing) {
    video.play();
  } else {
    video.pause();
  }
  window.setTimeout(() => { changeDisabled = false }, 1000);
}

$(document).ready(() => {
  socket = io();
  video = document.getElementById('video');
  username = prompt('Please enter a username');

  changeRoom(prompt('Please enter a room id'));
  socket.on('update', (data) => update(data));
  socket.on('message', (data) => {
    $('#chat').html('');
    for (let i = 0; i < data.messages.length; i++) {
      $('#chat').append(`<li class="message">${data.messages[i]}</li>`);
      $('#chat').scrollTop($('#chat')[0].scrollHeight);
    }
  });

  $('#send').on('mousedown', (e) => {
    $(e.currentTarget).css('filter', 'brightness(85%)');
  });
  $('#send').on('mouseup', (e) => {
    $(e.currentTarget).css('filter', 'brightness(100%)');
  });
  $('#send').on('click', (e) => {
    let val = document.getElementById('message-text').value;
    if (val.length > 0) {
      sendMessage(val);
      $('#message-text').val('');
    }
  });
  $('#message-text').on('keyup', (e) => {
    let val = document.getElementById('message-text').value;
    if (e.keyCode == 13 && val.length > 0) {
      sendMessage(val);
      $('#message-text').val('');
    }
  });

  $('#url-input').on('focus', (e) => {
    $(e.currentTarget).css('border-bottom', '2px solid #aaa');
  });
  $('#url-input').on('blur', (e) => {
    $(e.currentTarget).css('border-bottom', 'none');
  });

  $('#url-input').on('change', (e) => {
    $(video).attr('src', URL.createObjectURL(e.currentTarget.files[0]));
  });
  video.onseeked = () => {
    if (!changeDisabled) {
      socket.emit('seek', { id: id, video: { duration: video.currentTime, playing: video.paused } });
    }
  };
  video.onpause = () => {
    if (!changeDisabled) {
      socket.emit('seek', { id: id, video: { duration: video.currentTime, playing: false } });
    }
  };
  video.onplay = () => {
    if (!changeDisabled) {
      socket.emit('seek', { id: id, video: { duration: video.currentTime, playing: true } });
    }
  };
});

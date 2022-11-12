var drone = new ScaleDrone('hXXPzu5YK1njjOax');

drone.on('open', function (error) {
  if (error) return console.error(error);

  getJWT(drone.clientId, function (token) {
    drone.authenticate(token);
  });
});

drone.on('authenticate', function (error) {
  if (error) return console.error(error);

  var room = drone.subscribe('general-chat');

  room.on('open', function (error) {
    if (error) return console.error(error);
    console.log('Connected to room');
  });

  room.on('data', addMessageToScreen);        
});

function onSubmitForm(event) {
  var nameEl = document.querySelector('.input.name')
    , contentEl = document.querySelector('.input.content');

  if (nameEl.value && contentEl.value) {
    sendMessageToScaleDrone(nameEl.value, contentEl.value);
    contentEl.value = '';
  }
}

function sendMessageToScaleDrone(name, content) {
  drone.publish({
    room: 'general-chat',
    message: {
      name: name,
      content: content
    }
  });
}

function addMessageToScreen(message) {
  var div = document.createElement('div');
  div.innerHTML = '<b>' + message.name + '</b>: ' + message.content;
  div.classList.add('message');
  document.querySelector('.text-area').appendChild(div);
}

// Do a GET request to the JWT server
function getJWT(clientId, callback) {
  console.log('Asking for JSON Web Token..');
  request = new XMLHttpRequest();
  request.open('GET', 'http://localhost:1234/jwt?clientId=' + clientId, true);
  request.onload = function() {
    if (this.status >= 200 && this.status < 400) {
      callback(this.response);
    } else {
      console.error('Unable to get JWT', this);
    }
  };
  request.onerror = function(error) {
    console.error('Unable to get JWT', error);
  };
  request.send();
}
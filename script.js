const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; // Replace with your ScaleDrone Channel ID
const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5";  // Room name (must start with 'observable-')

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');

// When the connection is established
drone.on('open', error => {
  if (error) {
    console.error('Connection error:', error);
    return;
  }
  console.log('Connected to ScaleDrone');

  // Join a room
  const room = drone.subscribe(ROOM_NAME);
  room.on('open', error => {
    if (error) {
      console.error('Room join error:', error);
      return;
    }
    console.log('Joined room:', ROOM_NAME);
  });

  // Listen for messages in the room
  room.on('message', message => {
    const { data } = message;
    addMessageToChat(data);
  });
});

// Send message when hitting Enter
inputField.addEventListener('keypress', event => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    const message = inputField.value;
    drone.publish({
      room: ROOM_NAME,
      message
    });
    inputField.value = '';
  }
});

// Add message to chat
function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  messageElem.textContent = message;
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

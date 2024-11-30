const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; // Your ScaleDrone Channel ID
const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5";  // Room name (must start with 'observable-')

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const joinSection = document.getElementById('join-section');
const chatSection = document.getElementById('chat-section');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');

let username = ''; // To store the user's name

// Show join section and hide chat section initially
joinSection.style.display = 'flex';
chatSection.style.display = 'none';

// Join button functionality
joinBtn.addEventListener('click', () => {
  username = nameInput.value.trim(); // Get the username
  if (!username) {
    alert("Please enter your name to join the chat.");
    return;
  }

  // Hide join section and show chat section
  joinSection.style.display = 'none';
  chatSection.style.display = 'flex';

  // Initialize ScaleDrone connection
  drone.on('open', error => {
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    console.log('Connected to ScaleDrone');

    // Join the room
    const room = drone.subscribe(ROOM_NAME);
    room.on('open', error => {
      if (error) {
        console.error('Room join error:', error);
        return;
      }
      console.log('Joined room:', ROOM_NAME);
    });

    // Listen for incoming messages in the room
    room.on('message', message => {
      const { data } = message;
      addMessageToChat(data);
    });
  });
});

// Send message when hitting Enter
inputField.addEventListener('keypress', event => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    const message = `${username}: ${inputField.value}`; // Prefix message with username
    drone.publish({
      room: ROOM_NAME,
      message
    });
    inputField.value = ''; // Clear input field after sending
  }
});

// Add message to chat
function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  messageElem.textContent = message;
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to latest message
}

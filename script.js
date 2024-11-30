const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; // Replace with your ScaleDrone Channel ID
const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5";  // Room name (must start with 'observable-')

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const joinSection = document.getElementById('join-section');
const chatSection = document.getElementById('chat-section');
const joinButton = document.getElementById('join-btn');
const nameInput = document.getElementById('name-input');

let username = "";

// Show the chat section and hide the join section when the user joins
joinButton.addEventListener('click', () => {
  if (nameInput.value.trim()) {
    username = nameInput.value.trim();
    joinSection.style.display = 'none';
    chatSection.style.display = 'block';
    initializeChat();
  } else {
    alert("Please enter a valid name!");
  }
});

function initializeChat() {
  // When the connection is established
  drone.on('open', (error) => {
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    console.log('Connected to ScaleDrone');
    alert("Connected to ScaleDrone!");  // Show alert when connected

    // Join a room
    const room = drone.subscribe(ROOM_NAME);
    room.on('open', (error) => {
      if (error) {
        console.error('Room join error:', error);
        return;
      }
      console.log('Joined room:', ROOM_NAME);
      alert('Joined room successfully');
    });

    // Listen for incoming messages in the room
    room.on('message', (message) => {
      const { data } = message;
      console.log('Received message:', data);  // This will log the incoming messages to the console.
      addMessageToChat(data); // Display received message
    });
  });

  // Send message when hitting Enter
  inputField.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && inputField.value.trim()) {
      const message = `${username}: ${inputField.value}`;
      console.log('Sending message:', message);  // Log the message being sent
      drone.publish({
        room: ROOM_NAME,
        message
      });
      inputField.value = ''; // Clear input field after sending
    }
  });
}

// Add message to chat
function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  messageElem.textContent = message;  // Set the message text
  messagesDiv.appendChild(messageElem);  // Add message to the messages div

  // Auto-scroll to the latest message
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; 
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; 

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const usersList = document.getElementById('users-list');

let username = generateRandomUsername(); // Generate a random username

// Service Worker Registration for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// ScaleDrone Connection and Room Subscription
drone.on('open', (error) => {
  if (error) {
    console.error('Connection error:', error);
    alert('Failed to connect to ScaleDrone.');
    return;
  }
  console.log('Connected to ScaleDrone successfully.');
  
  const room = drone.subscribe(ROOM_NAME);
  room.on('open', (error) => {
    if (error) {
      console.error('Room join error:', error);
      alert('Failed to join the room.');
      return;
    }
    console.log('Joined room:', ROOM_NAME);
    // Show the messages and input field after joining
    messagesDiv.style.display = 'block';
    inputField.style.display = 'block';
    document.getElementById('left-container').style.display = 'block'; // Show left container
    document.getElementById('right-container').style.display = 'block'; // Show right container
  });

  room.on('message', (message) => {
    console.log('Received message:', message);
    addMessageToChat(message.data);
  });

  room.on('members', (members) => {
    updateOnlineUsers(members);
  });
});

// Message input and handling
inputField.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    const message = `${username}: ${inputField.value}`;
    console.log('Sending message:', message);
    sendMessage(message); // Send the message (offline or online)
    inputField.value = ''; 
  }
});

// Function to generate random username
function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty", "Brave", "Bold"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNum}`;
}

// Function to add messages to the chat window
function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  messageElem.textContent = message;
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
}

// Function to update the list of online users
function updateOnlineUsers(members) {
  usersList.innerHTML = ''; // Clear the list first
  members.forEach(member => {
    const userElem = document.createElement('li');
    userElem.textContent = member.clientId; // Display the clientId (you can customize this to show other details)
    usersList.appendChild(userElem);
  });
}

// Check if the user is offline
function isOffline() {
  return !navigator.onLine;
}

// Store message locally when the user is offline
function storeMessageLocally(message) {
  let offlineMessages = JSON.parse(localStorage.getItem('offlineMessages')) || [];
  offlineMessages.push(message);
  localStorage.setItem('offlineMessages', JSON.stringify(offlineMessages));
}

// Retrieve locally stored messages (when the user is back online)
function getOfflineMessages() {
  return JSON.parse(localStorage.getItem('offlineMessages')) || [];
}

// Function to send the message
function sendMessage(message) {
  if (isOffline()) {
    storeMessageLocally(message); // Store if offline
    alert("You're offline, the message will be sent once you're back online.");
  } else {
    // Send the message to the server (or via WebSockets)
    drone.publish({
      room: ROOM_NAME,
      message
    }, (error) => {
      if (error) {
        console.error('Error publishing message:', error);
      } else {
        console.log('Message sent:', message);
      }
    });
  }
}

// When the user comes back online, send the stored messages
window.addEventListener('online', () => {
  let offlineMessages = getOfflineMessages();

  if (offlineMessages.length > 0) {
    offlineMessages.forEach((message) => {
      // Send each stored message to the server
      console.log("Sending offline message:", message);
      drone.publish({
        room: ROOM_NAME,
        message
      }, (error) => {
        if (error) {
          console.error('Error publishing message:', error);
        } else {
          console.log('Offline message sent:', message);
        }
      });
    });

    // Clear offline messages after they've been sent
    localStorage.removeItem('offlineMessages');
  }
});

// Function to display message in the chat window
function displayMessage(message) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
}

// On page load, check if there are any offline messages to send
window.addEventListener('load', () => {
  let offlineMessages = getOfflineMessages();

  // Display any offline messages when the page loads
  offlineMessages.forEach((message) => {
    displayMessage(message);
  });
});

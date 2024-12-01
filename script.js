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

// Handle file upload
function uploadFile() {
  const fileInput = document.getElementById('fileUpload');
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const fileData = event.target.result;
      const filename = file.name;

      // Send a message saying the file is uploaded
      const message = `File uploaded: ${filename}`;
      sendMessage(message);

      // Create a download link for the file
      const downloadLink = document.createElement('a');
      downloadLink.href = fileData;
      downloadLink.download = filename;
      downloadLink.textContent = 'Download File';
      downloadLink.classList.add('download-link');

      // Append the download link to the message
      const messageDiv = document.createElement('div');
      messageDiv.textContent = message;
      messageDiv.appendChild(downloadLink); // Add the download link to the message
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
    };
    reader.readAsDataURL(file);
  }
}

// Function to send a message to the room
function sendMessage(message) {
  drone.publish({
    room: ROOM_NAME,
    message: { username, text: message }
  });
}

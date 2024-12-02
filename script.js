const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; 
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; 

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const fileInput = document.getElementById('fileInput');

let username = generateRandomUsername();

// Service Worker Registration for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then((registration) => {
    console.log('Service Worker registered with scope:', registration.scope);
  }).catch((error) => {
    console.log('Service Worker registration failed:', error);
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
  });

  room.on('message', (message) => {
    console.log("Received message:", message);
    addMessageToChat(message.data);
  });
});

// Send text message on Enter
inputField.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    event.preventDefault(); // Prevent new line on Enter
    sendMessage({ type: 'text', text: inputField.value });
    inputField.value = '';
  }
});

// Handle file upload
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;
      console.log('File read successfully:', fileData);
      
      // Detect if the file is an image based on MIME type
      const isImage = file.type.startsWith('image/');
      sendMessage({
        type: 'file',
        filename: file.name,
        content: fileData,
        fileType: file.type,
        isImage: isImage
      });
      alert('File uploaded: ' + file.name);
    };
    reader.onerror = () => {
      console.error('File reading failed:', reader.error);
      alert('File upload failed. Try again.');
    };
    reader.readAsDataURL(file);
  } else {
    alert('No file selected.');
  }
});

// Function to generate a random username
function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty", "Brave", "Bold"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNum}`;
}

// Function to send messages
function sendMessage(data) {
  console.log('Sending message:', data);
  drone.publish({
    room: ROOM_NAME,
    message: { ...data, username }
  });
}

// Function to add received messages to chat
function addMessageToChat(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (message.type === 'text') {
    messageDiv.textContent = `${message.username}: ${message.text}`;
  } else if (message.type === 'file') {
    if (message.isImage) {
      messageDiv.innerHTML = `
        ${message.username} sent an image:
        <img src="${message.content}" alt="${message.filename}" style="max-width: 200px; max-height: 200px; margin-top: 10px;">
      `;
    } else {
      messageDiv.innerHTML = `
        ${message.username} sent a file: 
        <a class="download-link" href="${message.content}" download="${message.filename}">
          Download ${message.filename}
        </a>
      `;
    }
  }
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Reset button functionality
const resetButton = document.getElementById('resetButton');

resetButton.addEventListener('click', () => {
  // Reload the page
  location.reload();
});

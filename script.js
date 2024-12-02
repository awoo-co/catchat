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
    console.error('Service Worker registration failed:', error);
  });
}

// Connect to ScaleDrone and subscribe to the room
drone.on('open', (error) => {
  if (error) {
    console.error('Connection error:', error);
    alert('Failed to connect to ScaleDrone.');
    return;
  }
  const room = drone.subscribe(ROOM_NAME);
  room.on('message', handleMessage);
});

// Prevent duplication by clearing existing listeners
function handleMessage(message) {
  if (message.data && !message.data.duplicate) {
    addMessageToChat(message.data);
  }
}

// Send text message on Enter
inputField.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    event.preventDefault();
    sendMessage({ type: 'text', text: inputField.value });
    inputField.value = '';
  }
});

// File Upload Handler
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;
      const isImage = file.type.startsWith('image/');
      sendMessage({
        type: 'file',
        filename: file.name,
        content: fileData,
        fileType: file.type,
        isImage: isImage
      });
      alert(`File uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }
});

// Send message function
function sendMessage(data) {
  drone.publish({ room: ROOM_NAME, message: { ...data, username } });
}

// Add messages to the chat box
function addMessageToChat(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  
  if (message.type === 'text') {
    messageDiv.textContent = `${message.username}: ${message.text}`;
  } else if (message.type === 'file') {
    if (message.isImage) {
      messageDiv.innerHTML = `
        <strong>${message.username}:</strong><br>
        <img src="${message.content}" alt="${message.filename}" style="max-width: 100%; max-height: 200px;">
      `;
    } else {
      messageDiv.innerHTML = `
        <strong>${message.username}:</strong> <a href="${message.content}" download="${message.filename}">${message.filename}</a>
      `;
    }
  }
  
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Random username generator
function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty", "Brave"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNum}`;
}

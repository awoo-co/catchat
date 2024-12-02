const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; 
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; 

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const fileInput = document.getElementById('fileInput');

let username = generateRandomUsername();
let db; // IndexedDB instance

// Initialize IndexedDB
const request = indexedDB.open("CatchatDB", 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (event) => {
  db = event.target.result;
  loadMessagesFromDB(); // Load messages on startup
};

request.onerror = (event) => {
  console.error("IndexedDB error:", event.target.error);
};

// Load messages from IndexedDB
function loadMessagesFromDB() {
  const transaction = db.transaction("messages", "readonly");
  const store = transaction.objectStore("messages");
  const request = store.getAll();

  request.onsuccess = (event) => {
    const messages = event.target.result;
    messages.forEach((message) => addMessageToChat(message.data, false));
  };
}

// Save message to IndexedDB
function saveMessageToDB(data) {
  const transaction = db.transaction("messages", "readwrite");
  const store = transaction.objectStore("messages");
  store.add({ data });
}

drone.on('open', (error) => {
  if (error) {
    console.error('Connection error:', error);
    alert('Failed to connect to ScaleDrone.');
    return;
  }
  const room = drone.subscribe(ROOM_NAME);
  room.on('open', (error) => {
    if (error) {
      console.error('Room join error:', error);
      alert('Failed to join the room.');
    }
  });
  room.on('message', (message) => {
    addMessageToChat(message.data, true);
    saveMessageToDB(message.data); // Save received message
  });
});

inputField.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    event.preventDefault();
    const message = { type: 'text', text: inputField.value, username };
    sendMessage(message);
    inputField.value = '';
  }
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;
      const isImage = file.type.startsWith('image/');
      const message = {
        type: 'file',
        filename: file.name,
        content: fileData,
        fileType: file.type,
        isImage: isImage,
        username
      };
      sendMessage(message);
    };
    reader.readAsDataURL(file);
  }
});

function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNum}`;
}

function sendMessage(data) {
  drone.publish({ room: ROOM_NAME, message: data });
  saveMessageToDB(data); // Save sent message
  addMessageToChat(data, false);
}

function addMessageToChat(message, fromRemote) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (message.type === 'text') {
    messageDiv.textContent = `${message.username}: ${message.text}`;
  } else if (message.type === 'file') {
    if (message.isImage) {
      messageDiv.innerHTML = `<strong>${message.username}:</strong><br><img src="${message.content}" style="max-width: 200px;">`;
    } else {
      messageDiv.innerHTML = `<strong>${message.username}:</strong> <a href="${message.content}" download="${message.filename}">Download ${message.filename}</a>`;
    }
  }
  messagesDiv.appendChild(messageDiv);
  if (!fromRemote) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {
    console.log('Service Worker registered with scope:', registration.scope);
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  });
}

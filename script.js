const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

// IndexedDB setup
let db;
const request = indexedDB.open('CatchatDB', 1);

request.onerror = function (event) {
  console.error('Error opening IndexedDB:', event.target.error);
  alert('Failed to open IndexedDB. Please reload the page.');
};

request.onsuccess = function (event) {
  db = event.target.result;
  console.log('IndexedDB opened successfully');
  loadMessages(); // Load saved messages when the database is ready
};

request.onupgradeneeded = function (event) {
  db = event.target.result;

  if (!db.objectStoreNames.contains('messages')) {
    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
  }

  if (!db.objectStoreNames.contains('files')) {
    db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
  }
};

// Generate random nickname and color
function generateRandomNickname() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
}

const drone = new ScaleDrone(CLIENT_ID, {
  data: {
    name: generateRandomNickname(),
    color: getRandomColor(),
  },
});

let members = [];

// Establish Scaledrone connection
drone.on('open', error => {
  if (error) {
    console.error('Connection Error:', error);
    alert('Failed to connect to the chat server.');
    return;
  }
  console.log('Successfully connected to Scaledrone');
  const room = drone.subscribe('catchat1');
  room.on('open', error => {
    if (error) {
      console.error('Room Error:', error);
    } else {
      console.log('Successfully joined room');
    }
  });

  room.on('members', m => { members = m; });
  room.on('member_join', member => { members.push(member); });
  room.on('member_leave', ({ id }) => { members = members.filter(m => m.id !== id); });

  room.on('data', (message, member) => {
    console.log('Received message:', message);
    addMessageToDOM(message, member);
  });
});

// Event Listeners
window.onload = function () {
  const sendButton = document.querySelector('#sendButton');
  const inputField = document.querySelector('#input');
  const uploadButton = document.querySelector('#uploadButton');
  const fileInput = document.querySelector('#fileInput');

  sendButton.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
  });

  uploadButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
};

// Send message function with debounce
let lastSent = 0;
function sendMessage() {
  const message = document.querySelector('#input').value.trim();
  if (message && Date.now() - lastSent > 500) {
    lastSent = Date.now();
    console.log('Sending message:', message);
    document.querySelector('#input').value = '';

    drone.publish({ room: 'catchat1', message });
    storeMessageInIndexedDB(message);
  }
}

// Add message to the DOM
function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    const url = urlMatch[0];
    messageElement.innerHTML = `<strong>File:</strong> <a href="${url}" target="_blank" style="color: white;">Click to view</a>`;
  } else {
    messageElement.innerHTML = member ? `<strong>${member.clientData.name}</strong>: ${message}` : `<strong>Server</strong>: ${message}`;
  }

  document.querySelector('#messages').appendChild(messageElement);
  document.querySelector('#messages').scrollTop = document.querySelector('#messages').scrollHeight;
}

// Store message in IndexedDB
function storeMessageInIndexedDB(message) {
  const transaction = db.transaction(['messages'], 'readwrite');
  transaction.objectStore('messages').add({ message, timestamp: new Date().toISOString() });
  transaction.onerror = event => console.error('Error saving message to IndexedDB:', event.target.error);
}

// Handle file upload with Filestack
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const client = filestack.init(filestackApiKey);
  client.upload(file)
    .then(res => {
      console.log('File uploaded successfully:', res);
      sendMessageWithFile(res.url);
      storeFileInIndexedDB(res.url);
    })
    .catch(err => {
      console.error('File upload error:', err);
      alert('Failed to upload the file. Please try again.');
    });
}

function sendMessageWithFile(url) {
  const message = `File uploaded: ${url}`;
  drone.publish({ room: 'catchat1', message });
  storeMessageInIndexedDB(message);
}

// Store uploaded file URL in IndexedDB
function storeFileInIndexedDB(fileUrl) {
  const transaction = db.transaction(['files'], 'readwrite');
  transaction.objectStore('files').add({ url: fileUrl, timestamp: new Date().toISOString() });
  transaction.onerror = event => console.error('Error saving file URL to IndexedDB:', event.target.error);
}

// Load saved messages from IndexedDB
function loadMessages() {
  const request = db.transaction(['messages'], 'readonly').objectStore('messages').getAll();
  request.onsuccess = event => event.target.result.forEach(msg => addMessageToDOM(msg.message));
  request.onerror = event => console.error('Error loading messages from IndexedDB:', event.target.error);
}

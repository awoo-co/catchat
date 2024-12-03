const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

// IndexedDB setup
let db;
const request = indexedDB.open('CatchatDB', 1);

request.onerror = function(event) {
  console.error('Error opening IndexedDB:', event);
};

request.onsuccess = function(event) {
  db = event.target.result;
  console.log('IndexedDB opened successfully');
  loadMessages(); // Load saved messages when the database is ready
};

request.onupgradeneeded = function(event) {
  db = event.target.result;

  // Create an object store for messages
  if (!db.objectStoreNames.contains('messages')) {
    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
  }

  // Create an object store for uploaded files
  if (!db.objectStoreNames.contains('files')) {
    db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
  }
};

// Function to generate a random nickname
function generateRandomNickname() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nickname = '';
  for (let i = 0; i < 10; i++) { // 10-character nickname
    nickname += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nickname;
}

// Function to generate random color
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
}

const drone = new ScaleDrone(CLIENT_ID, {
  data: {
    name: generateRandomNickname(),  // Ensure a random name is generated on connection
    color: getRandomColor(),
  },
});

let members = [];

// Establish Scaledrone connection
drone.on('open', error => {
  if (error) {
    console.error('Connection Error:', error);
    return;
  }
  console.log('Successfully connected to Scaledrone');
  const room = drone.subscribe('catchat1');  // Ensure this matches your room name
  room.on('open', error => {
    if (error) {
      console.error('Room Error:', error);
    } else {
      console.log('Successfully joined room');
    }
  });

  room.on('members', m => {
    members = m;
  });

  room.on('member_join', member => {
    console.log('New member joined:', member.clientData);  // Debug log to check the nickname
    members.push(member);
  });

  room.on('member_leave', ({ id }) => {
    const index = members.findIndex(member => member.id === id);
    members.splice(index, 1);
  });

  room.on('data', (message, member) => {
    console.log('Received message:', message); // Debug log to check if messages are received
    if (member) {
      console.log('Member clientData on message:', member.clientData); // Log member data
    }

    if (message) {
      addMessageToDOM(message, member);
    } else {
      console.log('Message from server:', message);
    }
  });
});

// Event Listeners
window.onload = function() {
  const sendButton = document.querySelector('#sendButton');
  const inputField = document.querySelector('#input');
  const uploadButton = document.querySelector('#uploadButton');
  const fileInput = document.querySelector('#fileInput');

  // Send message on button click
  sendButton.addEventListener('click', sendMessage);

  // Send message when Enter key is pressed
  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  // Upload file when the upload button is clicked
  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file input change event
  fileInput.addEventListener('change', handleFileUpload);
};

// Send message function
function sendMessage() {
  const message = document.querySelector('#input').value;
  if (message === '') return;
  console.log('Sending message:', message); // Debug log
  document.querySelector('#input').value = ''; // Clear input field after sending

  drone.publish({
    room: 'catchat1',
    message: message,
  });

  // Store message in IndexedDB
  storeMessageInIndexedDB(message);
}

// Add message to the DOM
function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  console.log('Adding message to DOM:', message);  // Log the message before appending

  // Check if the message contains a URL (likely the file upload URL)
  const urlMatch = message.match(/https?:\/\/[^\s]+/); // Regular expression for matching URLs
  if (urlMatch) {
    const url = urlMatch[0]; // Extract the URL from the message
    messageElement.innerHTML = `<strong>File:</strong> <a href="${url}" target="_blank">Click to view the file</a>`;
  } else if (member && member.clientData && member.clientData.name) {
    // Message from a user
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  } else {
    // Message from server (no member data)
    messageElement.innerHTML = `<strong>Server</strong>: ${message}`;
  }

  document.querySelector('#messages').appendChild(messageElement);
  document.querySelector('#messages').scrollTop = document.querySelector('#messages').scrollHeight;
}

// Store message in IndexedDB
function storeMessageInIndexedDB(message) {
  const transaction = db.transaction(['messages'], 'readwrite');
  const store = transaction.objectStore('messages');
  store.add({ message: message, timestamp: new Date().toISOString() });

  transaction.oncomplete = function() {
    console.log('Message saved to IndexedDB:', message);
  };

  transaction.onerror = function(event) {
    console.error('Error saving message to IndexedDB:', event);
  };
}

// Handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Using Filestack to upload file (no restriction on file type)
  const client = filestack.init(filestackApiKey);
  client.upload(file)
    .then(res => {
      console.log('File uploaded successfully:', res);
      sendMessageWithFile(res.url);  // Send file URL as a message
      storeFileInIndexedDB(res.url); // Store the file URL in IndexedDB
    })
    .catch(err => {
      console.error('File upload error:', err);
    });
}

// Send message with uploaded file URL
function sendMessageWithFile(url) {
  const message = `File uploaded: ${url}`;
  drone.publish({
    room: 'catchat1',
    message: message,
  });
  // Store message in IndexedDB
  storeMessageInIndexedDB(message);
}

// Store uploaded file URL in IndexedDB
function storeFileInIndexedDB(fileUrl) {
  const transaction = db.transaction(['files'], 'readwrite');
  const store = transaction.objectStore('files');
  store.add({ url: fileUrl, timestamp: new Date().toISOString() });

  transaction.oncomplete = function() {
    console.log('File URL saved to IndexedDB:', fileUrl);
  };

  transaction.onerror = function(event) {
    console.error('Error saving file URL to IndexedDB:', event);
  };
}

// Load saved messages from IndexedDB
function loadMessages() {
  const transaction = db.transaction(['messages'], 'readonly');
  const store = transaction.objectStore('messages');
  const request = store.getAll();

  request.onsuccess = function(event) {
    const messages = event.target.result;
    messages.forEach(msg => {
      addMessageToDOM(msg.message); // Display each message
    });
  };

  request.onerror = function(event) {
    console.error('Error loading messages from IndexedDB:', event);
  };
}

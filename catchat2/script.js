const CLIENT_ID = '9jZ0VVVWob4YwjKe';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

// Initialize IndexedDB
let db;
const request = indexedDB.open('CatchatDB', 1);

request.onerror = function(event) {
  console.error('Error opening IndexedDB:', event.target.error);
  alert('Failed to open IndexedDB. Please reload the page.');
};

request.onsuccess = function(event) {
  db = event.target.result;
  console.log('IndexedDB opened successfully');
  loadMessages();
};

request.onupgradeneeded = function(event) {
  db = event.target.result;
  if (!db.objectStoreNames.contains('messages')) {
    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
  }
};

// Nickname generator
const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
const numbers = Array.from({ length: 200 }, (_, i) => i + 1);
function generateNickname() {
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
  return `${randomWord}${randomNumber}`;
}

// Scaledrone setup
const drone = new ScaleDrone(CLIENT_ID, {
  data: { name: generateNickname(), color: '#ff6600' }
});
let members = [];

// Check for notification permission
function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        } else {
          console.log('Notification permission denied.');
        }
      });
    }
  }
}

drone.on('open', error => {
  if (error) {
    console.error('Connection Error:', error);
    alert('Failed to connect to the chat server.');
    return;
  }
  console.log('Successfully connected to Scaledrone');
  const room = drone.subscribe('catchat1');
  
  room.on('open', error => {
    if (error) console.error('Room Error:', error);
    else console.log('Successfully joined room');
  });

  room.on('members', m => {
    members = m;
    notify(`${members.length} users are now connected.`);
  });

  room.on('member_join', member => notify(`${member.clientData.name} has joined!`));
  room.on('member_leave', member => notify(`${member.clientData.name} has left.`));
  
  room.on('data', (message, member) => {
    addMessageToDOM(message, member);
    if (member) {
      notify(`New message from ${member.clientData.name}`);
      playAudio();  // Play audio when a message arrives
    }
  });
});

window.onload = function() {
  const sendButton = document.querySelector('#sendButton');
  const inputField = document.querySelector('#input');
  const uploadButton = document.querySelector('#uploadButton');
  const downloadButton = document.querySelector('#downloadButton');
  const fileUploadButton = document.querySelector('#fileUploadButton');

  sendButton.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });

  uploadButton.addEventListener('click', uploadDatabaseToFilestack);
  downloadButton.addEventListener('click', () => {
    const fileUrl = prompt('Enter the Filestack URL for the backup file');
    if (fileUrl) loadDatabaseFromFilestack(fileUrl);
  });

  fileUploadButton.addEventListener('click', () => {
    document.querySelector('#fileInput').click();
  });
  document.querySelector('#fileInput').addEventListener('change', handleFileUpload);

  // Request notification permission on page load
  requestNotificationPermission();
};

function notify(message) {
  if (Notification.permission === 'granted') {
    new Notification(message);
  } else {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

function sendMessage() {
  const input = document.querySelector('#input');
  const message = input.value.trim();
  if (message) {
    drone.publish({ room: 'catchat1', message });
    storeMessageInIndexedDB(message);
    clearInputField();
    playAudio();  // Play audio when the user sends a message
  }
}

function clearInputField() {
  document.querySelector('#input').value = '';
}

function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.innerHTML = `<strong>${member ? member.clientData.name : 'Server'}:</strong> ${message}`;
  document.querySelector('#messages').appendChild(messageElement);
  document.querySelector('#messages').scrollTop = document.querySelector('#messages').scrollHeight;
}

function storeMessageInIndexedDB(message) {
  const transaction = db.transaction(['messages'], 'readwrite');
  transaction.objectStore('messages').add({ message, timestamp: new Date().toISOString() });
}

function uploadDatabaseToFilestack() {
  const transaction = db.transaction(['messages'], 'readonly');
  const messagesStore = transaction.objectStore('messages');
  const allMessagesRequest = messagesStore.getAll();
  
  allMessagesRequest.onsuccess = function() {
    const messages = allMessagesRequest.result;
    const dataToUpload = new Blob([JSON.stringify(messages)], { type: 'application/json' });

    const client = filestack.init(filestackApiKey);
    client.upload(dataToUpload)
      .then(res => console.log('Database uploaded:', res))
      .catch(err => console.error('Upload error:', err));
  };
}

function loadDatabaseFromFilestack(fileUrl) {
  fetch(fileUrl)
    .then(response => response.json())
    .then(fileContent => {
      const transaction = db.transaction(['messages'], 'readwrite');
      const messagesStore = transaction.objectStore('messages');
      fileContent.forEach(msg => messagesStore.add(msg));
      loadMessages();
    })
    .catch(err => console.error('Load error:', err));
}

function loadMessages() {
  const request = db.transaction(['messages'], 'readonly').objectStore('messages').getAll();
  request.onsuccess = event => event.target.result.forEach(msg => addMessageToDOM(msg.message));
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const client = filestack.init(filestackApiKey);
  client.upload(file)
    .then(res => sendMessageWithFile(res.url, file))
    .catch(err => alert('File upload failed.'));
}

function sendMessageWithFile(url, file) {
  let message = '';
  if (file.type.startsWith('image/')) {
    message = `<img src="${url}" alt="${file.name}" style="max-width: 100px; max-height: 100px;" />`;
  } else {
    message = `<a href="${url}" target="_blank">${file.name}</a>`;
  }
  drone.publish({ room: 'catchat1', message });
  storeMessageInIndexedDB(message);
}

// Play the notification sound (ding.mp3)
function playAudio() {
  const audio = new Audio('src/ding.mp3'); // Ensure the correct path to the audio file
  audio.play()
    .catch(err => {
      console.error('Error playing sound:', err);
    });
}


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/catchat2/service-worker.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}
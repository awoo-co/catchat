// Ensure ScaleDrone is loaded
let drone;
const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; // Your ScaleDrone room name
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; // Your ScaleDrone channel ID

// IndexedDB setup
let db;
const DB_NAME = 'catchat-db';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

// Function to add messages to the chat
function addMessageToChat(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  if (message.type === 'file') {
    // Handle file messages (display a link to download the file)
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(message.file);
    downloadLink.download = message.fileName;
    downloadLink.textContent = `Download ${message.fileName}`;
    messageDiv.appendChild(downloadLink);
  } else {
    // Handle text messages
    messageDiv.textContent = `${message.username}: ${message.text}`;
  }
  document.getElementById('messages').appendChild(messageDiv);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// Open IndexedDB and load messages
const openDatabase = () => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = function (e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
  };

  request.onsuccess = function (e) {
    db = e.target.result;
    loadMessagesFromDB();
  };

  request.onerror = function (e) {
    console.error('Database error:', e.target.error);
  };
};

const saveMessageToDB = (message) => {
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.add(message);
};

const loadMessagesFromDB = () => {
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = function (e) {
    const messages = e.target.result;
    messages.forEach(msg => addMessageToChat(msg));
  };
};

// ScaleDrone connection
function connectToScaleDrone() {
  drone = new ScaleDrone(CHANNEL_ID);
  const messagesDiv = document.getElementById('messages');
  const inputField = document.getElementById('input');
  let username = generateRandomUsername();

  drone.on('open', (error) => {
    if (error) {
      console.error('Connection error:', error);
      alert('Failed to connect to ScaleDrone.');
      return;
    }
    console.log('Connected to ScaleDrone');
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
      addMessageToChat(message.data);
      saveMessageToDB(message.data); // Save received message to IndexedDB
    });
  });

  inputField.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && inputField.value.trim()) {
      event.preventDefault();
      const message = { type: 'text', text: inputField.value, username, timestamp: new Date() };
      sendMessageToScaleDrone(message);
      inputField.value = ''; // Clear input field
    }
  });

  function generateRandomUsername() {
    const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty", "Brave", "Bold"];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${randomAdj}${randomNum}`;
  }

  function sendMessageToScaleDrone(message) {
    drone.publish({
      room: ROOM_NAME,
      message: message
    });
  }
}

// File upload handler
document.querySelector('.file-button').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    console.log('File uploaded:', file.name);
    saveFileToDB(file);
  }
});

// Save file to IndexedDB
const saveFileToDB = (file) => {
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const fileMessage = { type: 'file', fileName: file.name, file: file, timestamp: new Date() };
  store.add(fileMessage);
  addFileToChat(fileMessage);
};

// Display file in chat
const addFileToChat = (fileMessage) => {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(fileMessage.file);
  downloadLink.download = fileMessage.fileName;
  downloadLink.textContent = `Download ${fileMessage.fileName}`;
  messageDiv.appendChild(downloadLink);
  document.getElementById('messages').appendChild(messageDiv);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
};

// Reset chat button
document.getElementById('resetButton').addEventListener('click', () => {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = ''; // Clear messages from UI
  loadMessagesFromDB(); // Reload messages from IndexedDB
});

// Clear IndexedDB and Service Worker Cache
function clearData() {
  // Clear IndexedDB
  const request = indexedDB.deleteDatabase(DB_NAME);
  request.onsuccess = () => {
    console.log('IndexedDB cleared successfully');
  };
  request.onerror = (event) => {
    console.error('Failed to clear IndexedDB:', event.target.error);
  };

  // Clear Service Worker cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('Service Worker unregistered successfully');
        }).catch((error) => {
          console.error('Failed to unregister service worker:', error);
        });
      });
    });
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service worker caches cleared');
    }).catch((error) => {
      console.error('Failed to clear service worker caches:', error);
    });
  } else {
    console.log('Service worker not supported');
  }
}

// Reload the page
function reloadPage() {
  location.reload();
}

// Initialize everything
openDatabase(); // Open IndexedDB and load existing messages
connectToScaleDrone(); // Connect to ScaleDrone for real-time chat

// Handle clear button click to reset everything
document.getElementById('resetButton').addEventListener('click', () => {
  clearData(); // Clear IndexedDB and Service Worker Cache
  reloadPage(); // Reload the page
});

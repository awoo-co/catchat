const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

// Application state
let myNickname = null;
let drone = null;
let members = [];
let db = null;
let lastMessageId = 0;
let isSendingMessage = false;

// Initialize IndexedDB
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CatchatDB', 3); // Version bumped to 3 for additional schema changes

    request.onerror = (event) => {
      console.error('Database error:', event.target.error);
      reject('Failed to open database');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('Database ready');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp');
        store.createIndex('by_sender', 'sender');
      }
    };
  });
}

// Nickname generator
function generateNickname() {
  const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
  const numbers = Array.from({ length: 200 }, (_, i) => i + 1);
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
  return `${randomWord}${randomNumber}`;
}

// Initialize Scaledrone connection
function initializeDrone() {
  return new Promise((resolve) => {
    const nickname = generateNickname();
    myNickname = nickname;
    document.getElementById('connectionStatus').textContent = "Connecting...";

    drone = new ScaleDrone(CLIENT_ID, {
      data: { name: nickname, color: '#ff6600' }
    });

    drone.on('open', error => {
      if (error) {
        console.error('Connection failed:', error);
        document.getElementById('connectionStatus').textContent = "Connection failed";
        document.getElementById('reconnectButton').style.display = 'block';
        return;
      }

      // Double-check clientData assignment
      if (drone.clientData && drone.clientData.name) {
        myNickname = drone.clientData.name;
        console.log("Nickname confirmed:", myNickname);
      }

      document.getElementById('connectionStatus').textContent = `Connected as ${myNickname}`;
      document.getElementById('reconnectButton').style.display = 'none';
      resolve();
    });

    drone.on('close', () => {
      document.getElementById('connectionStatus').textContent = "Disconnected";
      document.getElementById('reconnectButton').style.display = 'block';
    });

    drone.on('error', (error) => {
      console.error('Connection error:', error);
      document.getElementById('connectionStatus').textContent = "Connection error";
    });
  });
}

// Room handlers
function setupRoomHandlers() {
  const room = drone.subscribe('catchat1');

  room.on('open', error => {
    if (error) {
      console.error('Failed to join room:', error);
    } else {
      console.log('Successfully joined room');
    }
  });

  room.on('members', m => {
    members = m;
    notify(`${members.length} users in chat`);
  });

  room.on('member_join', member => {
    const name = member?.clientData?.name || "Anonymous";
    notify(`${name} joined the chat`);
  });

  room.on('member_leave', member => {
    const name = member?.clientData?.name || "Anonymous";
    notify(`${name} left the chat`);
  });

  room.on('data', (messageData, member) => {
    // Enhanced duplicate prevention
    if (messageData.id <= lastMessageId) {
      console.log('Ignoring duplicate message ID:', messageData.id);
      return;
    }

    // Only process if this isn't our own message
    if (messageData.sender !== myNickname && !isSendingMessage) {
      addMessageToDOM(messageData);
      playNotificationSound();
      storeMessage(messageData);
    }
  });
}

// Message handling with enhanced duplicate prevention
function sendMessage() {
  if (isSendingMessage) return;

  const input = document.getElementById('input');
  const messageText = input.value.trim();
  if (!messageText) return;

  isSendingMessage = true;
  const messageId = Date.now();
  lastMessageId = messageId;

  const messageData = {
    id: messageId,
    text: messageText,
    sender: myNickname,
    timestamp: new Date().toISOString(),
    isLocal: true // Mark as locally sent message
  };

  // Optimistic UI update
  addMessageToDOM(messageData);

  // Publish to other clients
  drone.publish({
    room: 'catchat1',
    message: messageData
  });

  // Store in database
  storeMessage(messageData);
  input.value = '';
  isSendingMessage = false; // Move this here to ensure it's reset
}

function addMessageToDOM(message) {
  // Enhanced duplicate checking
  const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
  if (existingMessage) {
    console.log('Duplicate message detected, skipping:', message.id);
    return;
  }

  const messagesDiv = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.dataset.messageId = message.id;

  const senderName = message.sender || "Unknown";
  messageElement.innerHTML = `<strong>${senderName}:</strong> ${message.text}`;

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Database operations with enhanced error handling
function storeMessage(message) {
  if (!db) {
    console.error('Database not initialized');
    return;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error('Database error:', event.target.error);
      reject(event.target.error);
    };

    store.put(message);
  });
}

function loadMessages() {
  if (!db) {
    console.error('Database not initialized');
    return;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('by_timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      // Show only the most recent 100 messages
      const messages = request.result.slice(-100);
      messages.forEach(msg => {
        // Skip messages that might be duplicates
        if (msg.id > lastMessageId) {
          addMessageToDOM(msg);
          lastMessageId = Math.max(lastMessageId, msg.id);
        }
      });
      resolve();
    };

    request.onerror = (event) => {
      console.error('Failed to load messages:', event.target.error);
      resolve();
    };
  });
}

// File handling with progress indication
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadStatus = document.createElement('div');
  uploadStatus.className = 'upload-status';
  uploadStatus.textContent = `Uploading ${file.name}...`;
  document.getElementById('messages').appendChild(uploadStatus);

  const client = filestack.init(filestackApiKey);
  client.upload(file, {
    onProgress: (evt) => {
      uploadStatus.textContent = `Uploading ${file.name}: ${Math.round(evt.totalPercent)}%`;
    }
  })
  .then(res => {
    uploadStatus.remove();
    const messageId = Date.now();
    const messageData = {
      id: messageId,
      text: file.type.startsWith('image/')
        ? `<img src="${res.url}" alt="${file.name}" style="max-width: 200px;">`
        : `<a href="${res.url}" target="_blank">${file.name}</a>`,
      sender: myNickname,
      timestamp: new Date().toISOString(),
      isLocal: true
    };

    lastMessageId = messageId;
    addMessageToDOM(messageData);
    drone.publish({
      room: 'catchat1',
      message: messageData
    });
    storeMessage(messageData);
  })
  .catch(err => {
    uploadStatus.textContent = `Failed to upload ${file.name}`;
    console.error('Upload failed:', err);
    setTimeout(() => uploadStatus.remove(), 3000);
  });
}

// Backup functions with improved user feedback
function uploadDatabaseToFilestack() {
  if (!db) {
    alert("Database not ready");
    return;
  }

  const status = document.createElement('div');
  status.className = 'backup-status';
  status.textContent = "Preparing backup...";
  document.getElementById('messages').appendChild(status);

  const transaction = db.transaction(['messages'], 'readonly');
  const store = transaction.objectStore('messages');
  const request = store.getAll();

  request.onsuccess = () => {
    status.textContent = "Uploading backup...";
    const data = new Blob([JSON.stringify(request.result)], { type: 'application/json' });
    const client = filestack.init(filestackApiKey);

    client.upload(data)
      .then(res => {
        status.textContent = "Backup successful!";
        console.log('Backup successful:', res);
        setTimeout(() => status.remove(), 3000);
      })
      .catch(err => {
        status.textContent = "Backup failed!";
        console.error('Backup failed:', err);
        setTimeout(() => status.remove(), 3000);
      });
  };

  request.onerror = () => {
    status.textContent = "Failed to prepare backup";
    setTimeout(() => status.remove(), 3000);
  };
}

function loadDatabaseFromFilestack() {
  const url = prompt("Enter backup file URL:");
  if (!url) return;

  const status = document.createElement('div');
  status.className = 'restore-status';
  status.textContent = "Restoring backup...";
  document.getElementById('messages').appendChild(status);

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch backup');
      return res.json();
    })
    .then(messages => {
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');

      store.clear().onsuccess = () => {
        const requests = messages.map(msg => store.put(msg));
        Promise.all(requests)
          .then(() => {
            status.textContent = "Restore successful!";
            loadMessages();
            setTimeout(() => status.remove(), 3000);
          })
          .catch(err => {
            status.textContent = "Partial restore completed";
            console.error('Some messages failed to restore:', err);
            loadMessages();
            setTimeout(() => status.remove(), 3000);
          });
      };
    })
    .catch(err => {
      status.textContent = "Restore failed!";
      console.error('Restore failed:', err);
      setTimeout(() => status.remove(), 3000);
    });
}

// Utilities with enhanced reliability
function playNotificationSound() {
  try {
    const audio = new Audio('/src/ding.mp3');
    audio.volume = 0.3; // Lower volume for less intrusive notifications
    audio.play().catch(e => console.log('Audio error:', e));
  } catch (e) {
    console.log('Failed to play sound:', e);
  }
}

function notify(message) {
  try {
    if (Notification.permission === 'granted') {
      const notification = new Notification('New message', { body: message });
      setTimeout(() => notification.close(), 5000);
    }
  } catch (e) {
    console.log('Notification error:', e);
  }
}

async function requestNotificationPermission() {
  try {
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  } catch (e) {
    console.log('Notification permission error:', e);
  }
}

// Initialize application with proper error handling
async function initializeApp() {
  try {
    document.getElementById('connectionStatus').textContent = "Initializing...";
    await initializeDatabase();
    await initializeDrone();
    setupRoomHandlers();
    await loadMessages();
    await requestNotificationPermission();
  } catch (error) {
    console.error('Initialization failed:', error);
    document.getElementById('connectionStatus').textContent = "Initialization failed";
    document.getElementById('reconnectButton').style.display = 'block';
  }
}

// Event listeners with proper cleanup
function setupEventListeners() {
  const sendButton = document.getElementById('sendButton');
  const inputField = document.getElementById('input');
  const fileUploadButton = document.getElementById('fileUploadButton');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadButton');
  const downloadButton = document.getElementById('downloadButton');
  const reconnectButton = document.getElementById('reconnectButton');

  const sendHandler = () => sendMessage();
  const keyHandler = (e) => { if (e.key === 'Enter') sendMessage(); };
  const fileClickHandler = () => fileInput.click();
  const fileChangeHandler = (e) => handleFileUpload(e);
  const uploadHandler = () => uploadDatabaseToFilestack();
  const downloadHandler = () => loadDatabaseFromFilestack();
  const reconnectHandler = () => initializeApp();

  sendButton.addEventListener('click', sendHandler);
  inputField.addEventListener('keypress', keyHandler);
  fileUploadButton.addEventListener('click', fileClickHandler);
  fileInput.addEventListener('change', fileChangeHandler);
  uploadButton.addEventListener('click', uploadHandler);
  downloadButton.addEventListener('click', downloadHandler);
  reconnectButton.addEventListener('click', reconnectHandler);

  // Return cleanup function
  return () => {
    sendButton.removeEventListener('click', sendHandler);
    inputField.removeEventListener('keypress', keyHandler);
    fileUploadButton.removeEventListener('click', fileClickHandler);
    fileInput.removeEventListener('change', fileChangeHandler);
    uploadButton.removeEventListener('click', uploadHandler);
    downloadButton.removeEventListener('click', downloadHandler);
    reconnectButton.removeEventListener('click', reconnectHandler);
  };
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  const cleanup = setupEventListeners();
  initializeApp();

  // Handle potential cleanup (though in a SPA you might not need this)
  window.addEventListener('beforeunload', () => {
    cleanup();
    if (drone) drone.close();
  });
});
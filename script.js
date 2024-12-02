const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; 
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; 

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const fileInput = document.getElementById('fileInput');

let username = generateRandomUsername();

// Initialize IndexedDB for file storage
const dbPromise = openIndexedDB();

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

// Handle file upload using IndexedDB
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    // Store file in IndexedDB
    storeFileInIndexedDB(file).then((fileId) => {
      sendMessage({
        type: 'file',
        fileId: fileId,
        filename: file.name,
        fileType: file.type,
      });
      alert('File uploaded: ' + file.name);
    }).catch((error) => {
      console.error('Failed to store file:', error);
      alert('File upload failed. Try again.');
    });
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
  }, (error) => {
    if (error) {
      console.error('Error publishing message:', error);
    } else {
      console.log('Message sent:', data);
    }
  });
}

// Function to add messages to the chat window
function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  
  if (message.type === 'text') {
    messageElem.textContent = `${message.username}: ${message.text}`;
  } else if (message.type === 'file') {
    getFileFromIndexedDB(message.fileId).then((file) => {
      if (file) {
        if (file.type.startsWith('image/')) {
          // Display image
          messageElem.innerHTML = `${message.username} uploaded: <br><img src="${URL.createObjectURL(file)}" alt="${message.filename}" style="max-width: 100%; border-radius: 8px;">`;
        } else {
          // Display file download link
          messageElem.innerHTML = `${message.username} uploaded: <a href="${URL.createObjectURL(file)}" download="${message.filename}">${message.filename}</a>`;
        }
      } else {
        messageElem.textContent = `${message.username} uploaded an invalid file.`;
      }
    }).catch(() => {
      messageElem.textContent = `${message.username} uploaded an invalid file.`;
    });
  }
  
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// IndexedDB functions

// Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CatchatFiles', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Store file in IndexedDB
function storeFileInIndexedDB(file) {
  return dbPromise.then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      const fileData = {
        filename: file.name,
        type: file.type,
        content: file,
      };

      const request = store.add(fileData);

      request.onsuccess = () => {
        resolve(request.result); // Return the ID of the stored file
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

// Retrieve file from IndexedDB
function getFileFromIndexedDB(fileId) {
  return dbPromise.then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(fileId);

      request.onsuccess = (event) => {
        resolve(event.target.result ? event.target.result.content : null);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

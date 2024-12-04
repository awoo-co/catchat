// Filestack API Key and IndexedDB setup
const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
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
  loadMessages(); // Load saved messages when the database is ready
};

request.onupgradeneeded = function(event) {
  db = event.target.result;
  if (!db.objectStoreNames.contains('messages')) {
    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains('files')) {
    db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
  }
};

// Nickname generator
const words = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet",
  "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango",
  "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu", "Adventurous", "Brave", "Curious",
  "Determined", "Energetic", "Fearless", "Gracious", "Hopeful", "Innovative", "Joyful", "Kindhearted",
  "Loyal", "Mighty", "Noble", "Optimistic", "Pioneering", "Quick-witted", "Resilient", "Strong",
  "Thoughtful", "Unique", "Vigilant", "Wise", "Xenial", "Young", "Zealous", "Atlas", "Bison", "Cheetah",
  // Add up to 200 words...
];

const numbers = Array.from({ length: 200 }, (_, i) => i + 1);

// Generate random nickname
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

  room.on('data', (message, member) => {
    console.log('Received message:', message);
    addMessageToDOM(message, member);
  });
});

// Event Listeners
window.onload = function() {
  const sendButton = document.querySelector('#sendButton');
  const inputField = document.querySelector('#input');
  const uploadButton = document.querySelector('#uploadButton');
  const downloadButton = document.querySelector('#downloadButton');
  const fileUploadButton = document.querySelector('#fileUploadButton'); // Added file upload button

  sendButton.addEventListener('click', sendMessage);
  
  // Send message with the Enter key
  inputField.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent the default action (new line)
      sendMessage(); // Call sendMessage when Enter is pressed
    }
  });
  
  uploadButton.addEventListener('click', uploadDatabaseToFilestack);
  downloadButton.addEventListener('click', () => {
    const fileUrl = prompt('Enter the Filestack URL for the backup file');
    if (fileUrl) {
      loadDatabaseFromFilestack(fileUrl);
    }
  });

  // Handle file upload button click
  fileUploadButton.addEventListener('click', () => {
    const fileInput = document.querySelector('#fileInput');
    fileInput.click(); // Trigger the file input click when the button is pressed
  });

  document.querySelector('#fileInput').addEventListener('change', handleFileUpload); // Handle file input change
};

// Send message
function sendMessage() {
  const message = document.querySelector('#input').value.trim();
  if (message) {
    console.log('Sending message:', message);
    drone.publish({ room: 'catchat1', message });
    storeMessageInIndexedDB(message);
    clearInputField(); // Clear the input field after sending
  }
}

// Clear the input field
function clearInputField() {
  document.querySelector('#input').value = '';
}

// Add message to the DOM
function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.innerHTML = `<strong>${member ? member.clientData.name : 'Server'}</strong>: ${message}`;
  document.querySelector('#messages').appendChild(messageElement);
}

// Store message in IndexedDB
function storeMessageInIndexedDB(message) {
  const transaction = db.transaction(['messages'], 'readwrite');
  transaction.objectStore('messages').add({ message, timestamp: new Date().toISOString() });
}

// Upload database to Filestack
function uploadDatabaseToFilestack() {
  const transaction = db.transaction(['messages'], 'readonly');
  const messagesStore = transaction.objectStore('messages');
  const allMessagesRequest = messagesStore.getAll();
  
  allMessagesRequest.onsuccess = function() {
    const messages = allMessagesRequest.result;
    const dataToUpload = new Blob([JSON.stringify(messages)], { type: 'application/json' });

    const client = filestack.init(filestackApiKey);
    client.upload(dataToUpload)
      .then(res => {
        console.log('Database uploaded to Filestack:', res);
      })
      .catch(err => {
        console.error('Failed to upload database:', err);
      });
  };
}

// Load database from Filestack
function loadDatabaseFromFilestack(fileUrl) {
  const client = filestack.init(filestackApiKey);
  client.download(fileUrl)
    .then(res => {
      console.log('Downloaded database file:', res);
      const file = res.filesUploaded[0];

      // Fetch file content and handle it
      fetch(file.url)
        .then(response => response.json())
        .then(fileContent => {
          console.log('Database content loaded:', fileContent);
          
          // Store the content into IndexedDB
          const transaction = db.transaction(['messages'], 'readwrite');
          const messagesStore = transaction.objectStore('messages');
          fileContent.forEach(msg => {
            messagesStore.add(msg);
          });
          console.log('Database loaded into IndexedDB');
          loadMessages();
        })
        .catch(err => console.error('Failed to fetch file content:', err));
    })
    .catch(err => {
      console.error('Failed to load database:', err);
    });
}

// Load saved messages from IndexedDB
function loadMessages() {
  const request = db.transaction(['messages'], 'readonly').objectStore('messages').getAll();
  request.onsuccess = event => {
    event.target.result.forEach(msg => addMessageToDOM(msg.message));
  };
}

// Handle file upload (File Upload Button)
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('File selected for upload:', file.name); // Log the selected file

  const client = filestack.init(filestackApiKey);

  // Start the file upload and log the progress
  client.upload(file)
    .then(res => {
      console.log('File uploaded successfully:', res);
      sendMessageWithFile(res.url, file);
    })
    .catch(err => {
      console.error('File upload error:', err);
      alert('Failed to upload the file. Please try again.');
    });
}

// Send message with file URL
function sendMessageWithFile(url, file) {
  let message = '';
  
  if (file.type.startsWith('image/')) {
    // For images, embed the image
    message = `<img src="${url}" alt="${file.name}" style="max-width: 100px; max-height: 100px;" />`;
  } else if (file.type.startsWith('video/')) {
    // For videos, embed the video
    message = `<video controls style="max-width: 100%; max-height: 400px;"><source src="${url}" type="${file.type}">Your browser does not support the video tag.</video>`;
  } else {
    // For other file types, create a clickable link
    message = `<a href="${url}" target="_blank">Click here to download ${file.name}</a>`;
  }
  
  drone.publish({ room: 'catchat1', message });
  storeMessageInIndexedDB(message);
}

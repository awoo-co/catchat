const CLIENT_ID = 'VcFdeFedyz6Pcbkw';

// Generate random nickname
function generateRandomNickname() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nickname = '';
  for (let i = 0; i < 10; i++) { // 10-character nickname
    nickname += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nickname;
}

const drone = new ScaleDrone(CLIENT_ID, {
  data: {
    name: generateRandomNickname(), 
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
  const room = drone.subscribe('catchat1');
  room.on('open', error => {
    if (error) {
      console.error('Room Error:', error);
    } else {
      console.log('Successfully joined room');
    }
  });

  room.on('data', (message, member) => {
    if (message) {
      addMessageToDOM(message, member);
    }
  });
});

// Event Listeners
window.onload = function() {
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

// Send message
function sendMessage() {
  const message = document.querySelector('#input').value;
  if (message === '') return;
  document.querySelector('#input').value = ''; 

  drone.publish({
    room: 'catchat1',
    message: message,
  });
}

// Add message to the DOM
function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  if (member && member.clientData.name) {
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  } else {
    messageElement.innerHTML = `<strong>Server</strong>: ${message}`;
  }
  
  // Handle file URLs
  if (message.includes('http')) {
    const url = message.match(/http[^ ]+/)[0];
    messageElement.innerHTML = `<strong>File:</strong> <a href="${url}" target="_blank">Click to view the file</a>`;
  }

  document.querySelector('#messages').appendChild(messageElement);
  document.querySelector('#messages').scrollTop = document.querySelector('#messages').scrollHeight;
}

// Handle file upload using Netlify functions (client-side)
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  // Post the file to a Netlify function (e.g., 'upload')
  fetch('/.netlify/functions/upload', {
    method: 'POST',
    body: formData,
  })
  .then(response => response.json())
  .then(data => {
    console.log('File uploaded successfully:', data);
    sendMessage(`File uploaded: ${data.fileUrl}`);
  })
  .catch(err => console.error('File upload failed:', err));
}

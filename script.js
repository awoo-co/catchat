// Replace with your own channel ID and Filestack API key
const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

const drone = new ScaleDrone(CLIENT_ID, {
  data: {
    name: generateRandomNickname(),
    color: getRandomColor(),
  },
});

let members = [];

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

  room.on('members', m => {
    members = m;
    updateMembersDOM();
  });

  room.on('member_join', member => {
    members.push(member);
    updateMembersDOM();
  });

  room.on('member_leave', ({id}) => {
    const index = members.findIndex(member => member.id === id);
    members.splice(index, 1);
    updateMembersDOM();
  });

  room.on('data', (message, member) => {
    if (member) {
      addMessageToDOM(message, member);
    } else {
      console.log('Message from server:', message);
    }
  });
});

function generateRandomNickname() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nickname = '';
  for (let i = 0; i < 200; i++) {
    nickname += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nickname;
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
}

// DOM elements
const DOM = {
  messages: document.querySelector('#messages'),
  input: document.querySelector('#input'),
  sendButton: document.querySelector('#sendButton'),
  fileInput: document.querySelector('#fileInput'),
  uploadButton: document.querySelector('#uploadButton'),
  offlineImage: document.querySelector('.offline-image-container')
};

// Send text message
DOM.sendButton.addEventListener('click', sendMessage);
DOM.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = DOM.input.value;
  if (message === '') return;
  DOM.input.value = ''; // Clear input field after sending

  drone.publish({
    room: 'catchat1',
    message: message,
  });
}

function updateMembersDOM() {
  const membersCount = document.querySelector('.members-count');
  membersCount.innerText = `${members.length} users in room:`;
}

function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  if (message.includes('<a href="')) {
    // Check if it's a file URL
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  } else {
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  }
  DOM.messages.appendChild(messageElement);
  DOM.messages.scrollTop = DOM.messages.scrollHeight; // Scroll to the bottom
}

// Handle file uploads
DOM.uploadButton.addEventListener('click', () => {
  DOM.fileInput.click();
});

DOM.fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload() {
  const file = DOM.fileInput.files[0];
  if (!file) return;

  // Upload file using Filestack
  const client = filestack.init(filestackApiKey);
  client.upload(file)
    .then(result => {
      const fileUrl = result.url;
      sendMessageWithFile(fileUrl);
    })
    .catch(error => {
      console.error('File upload failed:', error);
    });
}

function sendMessageWithFile(fileUrl) {
  drone.publish({
    room: 'catchat1',
    message: `<a href="${fileUrl}" target="_blank">Click to view file</a>`,
  });
}

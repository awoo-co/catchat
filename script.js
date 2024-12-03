const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

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
    name: generateRandomNickname(),
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
    updateMembersDOM();
  });

  room.on('member_join', member => {
    console.log('New member joined:', member.clientData);
    members.push(member);
    updateMembersDOM();
  });

  room.on('member_leave', ({ id }) => {
    const index = members.findIndex(member => member.id === id);
    members.splice(index, 1);
    updateMembersDOM();
  });

  room.on('data', (message, member) => {
    console.log('Received message:', message);
    if (message) {
      addMessageToDOM(message, member);
    }
  });
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
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
});

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
}

// Update member count in DOM
function updateMembersDOM() {
  const membersCount = document.querySelector('.members-count');
  membersCount.innerText = `${members.length} users in room:`;
}

// Add message to the DOM
function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  console.log('Adding message to DOM:', message);  // Log the message before appending

  // Check if member exists and has clientData
  if (member && member.clientData && member.clientData.name) {
    messageElement.innerHTML = `<strong style="color: ${member.clientData.color}">${member.clientData.name}:</strong> ${message}`;
  } else {
    messageElement.innerHTML = `<strong>Server:</strong> ${message}`;
  }

  const messagesContainer = document.querySelector('#messages');
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    console.log('No file selected');
    return;
  }

  console.log('Uploading file:', file);

  // Initialize Filestack client
  const client = filestack.init(filestackApiKey);

  // Upload the file
  client.upload(file).then(result => {
    console.log('File uploaded successfully:', result); // Log the successful file upload
    const fileUrl = result.url;

    // Send message with file URL
    sendMessageWithFile(fileUrl);
  }).catch(error => {
    console.error('File upload failed:', error); // Log the error if upload fails
  });
}

// Send a message with the file URL
function sendMessageWithFile(fileUrl) {
  console.log('Sending message with file URL:', fileUrl);  // Debug log before publishing the message
  drone.publish({
    room: 'catchat1',
    message: `<a href="${fileUrl}" target="_blank">Click to view file</a>`,
  });
}

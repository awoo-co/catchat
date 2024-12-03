const CLIENT_ID = 'VcFdeFedyz6Pcbkw';
const filestackApiKey = 'A8Kzo8mSSkWxnuNmfkHbLz';

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
    members.push(member);
    updateMembersDOM();
  });

  room.on('member_leave', ({ id }) => {
    const index = members.findIndex(member => member.id === id);
    members.splice(index, 1);
    updateMembersDOM();
  });

  room.on('data', (message, member) => {
    console.log('Received message:', message); // Debug log
    if (member) {
      addMessageToDOM(message, member);
    } else {
      console.log('Message from server:', message);
    }
  });
});

// Helper functions
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

// Event Listeners
document.querySelector('#sendButton').addEventListener('click', sendMessage);
document.querySelector('#input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

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

function updateMembersDOM() {
  const membersCount = document.querySelector('.members-count');
  membersCount.innerText = `${members.length} users in room:`;
}

function addMessageToDOM(message, member) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  console.log('Adding message to DOM:', message);  // Log the message before appending

  if (message.includes('<a href="')) {
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  } else {
    messageElement.innerHTML = `<strong>${member.clientData.name}</strong>: ${message}`;
  }

  document.querySelector('#messages').appendChild(messageElement);
  document.querySelector('#messages').scrollTop = document.querySelector('#messages').scrollHeight;
}

document.querySelector('#uploadButton').addEventListener('click', () => {
  document.querySelector('#fileInput').click();
});

document.querySelector('#fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload() {
  const file = document.querySelector('#fileInput').files[0];
  if (!file) return;

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

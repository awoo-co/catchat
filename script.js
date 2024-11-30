const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5"; 
const CHANNEL_ID = "VcFdeFedyz6Pcbkw"; 

const drone = new ScaleDrone(CHANNEL_ID);
const messagesDiv = document.getElementById('messages');
const inputField = document.getElementById('input');
const usersList = document.getElementById('users-list');

let username = generateRandomUsername(); // Generate a random username

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
    // Show the messages and input field after joining
    messagesDiv.style.display = 'block';
    inputField.style.display = 'block';
    document.getElementById('left-container').style.display = 'block'; // Show left container
    document.getElementById('right-container').style.display = 'block'; // Show right container
  });

  room.on('message', (message) => {
    console.log('Received message:', message);
    addMessageToChat(message.data);
  });

  room.on('members', (members) => {
    updateOnlineUsers(members);
  });
});

inputField.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && inputField.value.trim()) {
    const message = `${username}: ${inputField.value}`;
    console.log('Sending message:', message);
    drone.publish({
      room: ROOM_NAME,
      message
    }, (error) => {
      if (error) {
        console.error('Error publishing message:', error);
      } else {
        console.log('Message sent:', message);
      }
    });
    inputField.value = ''; 
  }
});

function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Silent", "Swift", "Mighty", "Brave", "Bold"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNum}`;
}

function addMessageToChat(message) {
  const messageElem = document.createElement('div');
  messageElem.textContent = message;
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateOnlineUsers(members) {
  usersList.innerHTML = ''; // Clear the list first
  members.forEach(member => {
    const userElem = document.createElement('li');
    userElem.textContent = member.clientId; // Display the clientId (you can customize this to show other details)
    usersList.appendChild(userElem);
  });
}


// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

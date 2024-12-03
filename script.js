const CHANNEL_ID = "VcFdeFedyz6Pcbkw";
const ROOM_NAME = "ht1OPcsBgvG9eEZYkjffs0sMTTqp02E5";
let db;
let drone;

document.addEventListener("DOMContentLoaded", () => {
  openDatabase();
  connectToScaleDrone();
  checkOnlineStatus();
  registerServiceWorker();
});

function openDatabase() {
  const request = indexedDB.open("catchat-db", 1);

  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("messages")) {
      db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("files")) {
      db.createObjectStore("files", { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    loadMessagesFromDB();
    loadFilesFromDB();
  };

  request.onerror = (e) => {
    console.error("Error opening database:", e.target.errorCode);
  };
}

function loadMessagesFromDB() {
  const request = db.transaction("messages", "readonly").objectStore("messages").getAll();
  request.onsuccess = (e) => {
    e.target.result.forEach((msg) => addMessageToChat(msg));
  };
  request.onerror = (e) => {
    console.error("Error loading messages from DB:", e.target.error);
  };
}

function loadFilesFromDB() {
  const request = db.transaction("files", "readonly").objectStore("files").getAll();
  request.onsuccess = (e) => {
    const files = e.target.result;
    console.log("Loaded files from DB:", files);
    // Handle the loaded files as needed (e.g., display them or store them)
  };
  request.onerror = (e) => {
    console.error("Error loading files from DB:", e.target.error);
  };
}

function connectToScaleDrone() {
  drone = new ScaleDrone(CHANNEL_ID);

  drone.on("open", () => {
    console.log("Connected to ScaleDrone");
    const room = drone.subscribe(ROOM_NAME);
    room.on("open", () => console.log("Joined room:", ROOM_NAME));
    room.on("message", (message) => {
      addMessageToChat(message.data);
      saveMessageToDB(message.data);
    });
  });

  drone.on("error", (error) => {
    console.error("ScaleDrone error:", error);
  });

  drone.on("close", () => {
    console.warn("ScaleDrone connection closed. Attempting reconnection...");
    setTimeout(connectToScaleDrone, 5000);
  });

  document.getElementById("input").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      sendMessage({ text: e.target.value, username: generateRandomUsername() });
      e.target.value = "";
    }
  });
}

function saveMessageToDB(message) {
  const transaction = db.transaction("messages", "readwrite");
  const store = transaction.objectStore("messages");
  store.add(message);

  transaction.onerror = (e) => {
    console.error("Error saving message to DB:", e.target.error);
  };
}

function saveFileToDB(file) {
  const transaction = db.transaction("files", "readwrite");
  const store = transaction.objectStore("files");
  store.add(file);

  transaction.onerror = (e) => {
    console.error("Error saving file to DB:", e.target.error);
  };
}

function generateRandomUsername() {
  const adjectives = ["Fast", "Cool", "Brave"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${Math.floor(Math.random() * 1000)}`;
}

function addMessageToChat(message) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.textContent = `${message.username}: ${message.text}`;
  messages.appendChild(div);
}

function sendMessage(message) {
  if (drone && drone._socket && drone._socket.readyState === WebSocket.OPEN) {
    drone.publish({ room: ROOM_NAME, message });
  } else {
    console.warn("ScaleDrone connection is not open. Adding message to queue.");
    const retryInterval = setInterval(() => {
      if (drone && drone._socket && drone._socket.readyState === WebSocket.OPEN) {
        drone.publish({ room: ROOM_NAME, message });
        clearInterval(retryInterval);
      }
    }, 1000);
  }
}

function checkOnlineStatus() {
  const offlineBanner = document.querySelector(".offline-image-container");

  function updateBanner() {
    offlineBanner.classList.toggle("show", !navigator.onLine);
  }

  window.addEventListener("online", updateBanner);
  window.addEventListener("offline", updateBanner);
  updateBanner(); 
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").then(
      (registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      },
      (error) => {
        console.error("Service Worker registration failed:", error);
      }
    );
  } else {
    console.warn("Service Worker not supported in this browser.");
  }
}

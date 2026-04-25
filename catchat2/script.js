const CLIENT_ID = '9jZ0VVVWob4YwjKe';

// Application state
let myNickname = null;
let drone = null;
let members = [];
let db = null;
let lastMessageId = 0;
let isSendingMessage = false;
let roomJoinResolved = false;
let puterAuthReady = false;
let puterLoadPromise = null;
let puterSocketWarningWorkaroundInstalled = false;
let puterDisabledReason = '';
const PRODUCTION_HOST = 'awoo-co.github.io';

function isProductionHost() {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }

  const host = window.location.hostname || '';
  return host === PRODUCTION_HOST || host.endsWith(`.${PRODUCTION_HOST}`);
}

function setModeBanner(mode, reason) {
  const banner = document.getElementById('modeBanner');
  if (!banner) {
    return;
  }

  if (mode === 'local') {
    banner.classList.remove('mode-cloud');
    banner.classList.add('mode-local');
    banner.textContent = reason
      ? `Storage mode: Local fallback (${reason})`
      : 'Storage mode: Local fallback';
    return;
  }

  banner.classList.remove('mode-local');
  banner.classList.add('mode-cloud');
  banner.textContent = 'Storage mode: Cloud (Puter)';
}

function setLoadingProgress(percent, label) {
  const boundedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const loadingBar = document.getElementById('loadingBar');
  const loadingPercent = document.getElementById('loadingPercent');
  const loadingLabel = document.getElementById('loadingLabel');

  if (loadingBar) {
    loadingBar.style.width = `${boundedPercent}%`;
  }

  if (loadingPercent) {
    loadingPercent.textContent = `${boundedPercent}%`;
  }

  if (loadingLabel && label) {
    loadingLabel.textContent = label;
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;

  overlay.classList.add('hidden');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 260);
}

function sanitizeFileName(name) {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isGithubDevHost() {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }

  const host = window.location.hostname || '';
  return host.endsWith('.github.dev') || host.endsWith('.app.github.dev');
}

function disablePuterForSession(reason) {
  if (!puterDisabledReason) {
    puterDisabledReason = reason || 'Puter unavailable in this environment';
    console.warn(`Puter disabled for this session: ${puterDisabledReason}`);
    setModeBanner('local', puterDisabledReason);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function downloadBlobLocally(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function pickLocalFile(accept = '.json') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      document.body.removeChild(input);
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      resolve(file);
    };

    document.body.appendChild(input);
    input.click();
  });
}

function resolvePuterReadUrl(item, fallbackPath) {
  if (!item) {
    return fallbackPath;
  }

  return item.readURL || item.read_url || item.readUrl || item.path || fallbackPath;
}

function installPuterSocketWarningWorkaround() {
  if (puterSocketWarningWorkaroundInstalled || typeof window === 'undefined' || !window.WebSocket) {
    return;
  }

  const NativeWebSocket = window.WebSocket;

  // Avoid browser console noise caused by closing a CONNECTING puter socket.io websocket.
  window.WebSocket = function patchedWebSocket(url, protocols) {
    const ws = protocols === undefined
      ? new NativeWebSocket(url)
      : new NativeWebSocket(url, protocols);

    try {
      const isPuterSocket = typeof url === 'string' && url.includes('wss://api.puter.com/socket.io/');
      if (isPuterSocket) {
        const nativeClose = ws.close.bind(ws);
        ws.close = function patchedClose(code, reason) {
          if (ws.readyState === NativeWebSocket.CONNECTING) {
            return;
          }
          return nativeClose(code, reason);
        };
      }
    } catch (error) {
      console.warn('Puter websocket workaround setup failed:', error);
    }

    return ws;
  };

  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;

  puterSocketWarningWorkaroundInstalled = true;
}

function loadPuterSDK() {
  if (window.puter) {
    return Promise.resolve(window.puter);
  }

  if (!isProductionHost()) {
    return Promise.reject(new Error('Puter is disabled outside the production domain'));
  }

  installPuterSocketWarningWorkaround();

  if (puterLoadPromise) {
    return puterLoadPromise;
  }

  puterLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-sdk="puter"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.puter), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Puter SDK')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.dataset.sdk = 'puter';
    script.onload = () => resolve(window.puter);
    script.onerror = () => reject(new Error('Failed to load Puter SDK'));
    document.head.appendChild(script);
  });

  return puterLoadPromise;
}

async function showPuterSavePicker(content, suggestedName) {
  if (!window.puter || !window.puter.ui || typeof window.puter.ui.showSaveFilePicker !== 'function') {
    throw new Error('Puter save picker is not available');
  }

  const savedItem = await window.puter.ui.showSaveFilePicker(content, suggestedName);
  if (!savedItem || typeof savedItem !== 'object') {
    throw new Error('Save cancelled');
  }

  return savedItem;
}

async function showPuterOpenPicker() {
  if (!window.puter || !window.puter.ui || typeof window.puter.ui.showOpenFilePicker !== 'function') {
    throw new Error('Puter open picker is not available');
  }

  const picked = await window.puter.ui.showOpenFilePicker({ multiple: false });
  if (!picked) {
    throw new Error('Open cancelled');
  }

  return Array.isArray(picked) ? picked[0] : picked;
}

async function ensurePuterAuth() {
  if (puterDisabledReason) {
    throw new Error(puterDisabledReason);
  }

  if (!isProductionHost()) {
    disablePuterForSession('Puter is only enabled on the production domain; using local fallback.');
    throw new Error(puterDisabledReason);
  }

  if (puterAuthReady) {
    return;
  }

  await loadPuterSDK();

  if (!window.puter) {
    throw new Error('Puter.js is not available');
  }

  if (window.puter.ui && typeof window.puter.ui.authenticateWithPuter === 'function') {
    await window.puter.ui.authenticateWithPuter();
  }

  puterAuthReady = true;
  setModeBanner('cloud');
}

async function shouldUsePuter() {
  try {
    await ensurePuterAuth();
    return true;
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (/cancel/i.test(message)) {
      throw error;
    }

    if (!puterDisabledReason) {
      disablePuterForSession(message);
    }
    return false;
  }
}

// Initialize IndexedDB
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CatchatDB', 3);

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
    setLoadingProgress(55, 'Connecting to chat...');

    drone = new ScaleDrone(CLIENT_ID, {
      data: { name: nickname, color: '#ff6600' }
    });

    drone.on('open', error => {
      if (error) {
        console.error('Connection failed:', error);
        document.getElementById('connectionStatus').textContent = "Connection failed";
        document.getElementById('reconnectButton').style.display = 'block';
        setLoadingProgress(100, 'Connection failed');
        return;
      }

      if (drone.clientData && drone.clientData.name) {
        myNickname = drone.clientData.name;
        console.log("Nickname confirmed:", myNickname);
      }

      document.getElementById('connectionStatus').textContent = `Connected as ${myNickname}`;
      document.getElementById('reconnectButton').style.display = 'none';
      setLoadingProgress(72, 'Connected. Joining room...');
      resolve();
    });

    drone.on('close', () => {
      document.getElementById('connectionStatus').textContent = "Disconnected";
      document.getElementById('reconnectButton').style.display = 'block';
      setLoadingProgress(100, 'Disconnected');
    });

    drone.on('error', (error) => {
      console.error('Connection error:', error);
      document.getElementById('connectionStatus').textContent = "Connection error";
      setLoadingProgress(100, 'Connection error');
    });
  });
}

// Room handlers
function setupRoomHandlers() {
  roomJoinResolved = false;
  const room = drone.subscribe('catchat2');

  room.on('open', error => {
    if (error) {
      console.error('Failed to join room:', error);
      setLoadingProgress(100, 'Failed to join chat room');
    } else {
      console.log('Successfully joined room');
      if (!roomJoinResolved) {
        roomJoinResolved = true;
        setLoadingProgress(82, 'Room joined. Syncing messages...');
      }
    }
  });

  room.on('members', m => {
    members = m;
    if (!roomJoinResolved) {
      roomJoinResolved = true;
      setLoadingProgress(82, 'Room joined. Syncing messages...');
    }
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
    if (messageData.id <= lastMessageId) return;
    // Check if the message is from a different sender or if it's a local message being published
    // The !isSendingMessage check is to prevent adding our own published messages twice when they come back via Scaledrone
    // The isLocal property is to distinguish messages originating from the current client
    // Only display messages that are not our own echoes or are genuinely new.
    if (messageData.sender !== myNickname || messageData.isLocal) {
        addMessageToDOM(messageData);
        // Only play sound for incoming messages, not our own local ones being displayed
        if (messageData.sender !== myNickname) {
            playNotificationSound();
        }
        // Only store if it's a new message or our own sent message (which should be stored once)
        storeMessage(messageData);
    }
  });
}

// Message handling
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
    isLocal: true // Mark as local message for initial DOM display and to avoid re-processing when it echoes back
  };

  addMessageToDOM(messageData); // Add immediately to DOM
  drone.publish({ room: 'catchat2', message: messageData });
  storeMessage(messageData);
  input.value = '';
  isSendingMessage = false;
}

function addMessageToDOM(message) {
  const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
  if (existingMessage) return;

  const messagesDiv = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  // Add a class for messages sent by the current user
  if (message.sender === myNickname) {
    messageElement.classList.add('my-message');
  }

  messageElement.dataset.messageId = message.id;

  const senderName = message.sender || "Unknown";
  messageElement.innerHTML = `<strong>${senderName}:</strong> ${message.text}`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Database operations
function storeMessage(message) {
  if (!db) return;

  // Create a copy to remove 'isLocal' before storing, as it's a transient state
  const messageToStore = { ...message };
  delete messageToStore.isLocal;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
    store.put(messageToStore);
  });
}

function loadMessages() {
  if (!db) return;

  return new Promise((resolve) => {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('by_timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const messages = request.result.slice(-100); // Load last 100 messages
      messages.forEach(msg => {
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

// File handling with Puter.js
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadStatus = document.createElement('div');
  uploadStatus.className = 'upload-status';
  uploadStatus.textContent = `Uploading ${file.name}...`;
  document.getElementById('messages').appendChild(uploadStatus);

  try {
    let fileUrl = '';
    const usePuter = await shouldUsePuter();
    if (usePuter) {
      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const uploadedItem = await showPuterSavePicker(file, fileName);
      fileUrl = resolvePuterReadUrl(uploadedItem, '');
    } else {
      if (file.size > 450 * 1024) {
        throw new Error('Local fallback supports files up to 450KB.');
      }
      fileUrl = await fileToDataUrl(file);
    }

    if (!fileUrl) {
      throw new Error('Could not get a usable file URL');
    }

    uploadStatus.remove();
    const safeName = escapeHtml(file.name);

    const messageData = {
      id: Date.now(),
      text: file.type.startsWith('image/')
        ? `<img src="${fileUrl}" alt="${safeName}" style="max-width: 200px;">`
        : `<a href="${fileUrl}" target="_blank" download="${safeName}">${safeName}</a>`,
      sender: myNickname,
      timestamp: new Date().toISOString(),
      isLocal: true // Mark as local
    };

    addMessageToDOM(messageData);
    drone.publish({ room: 'catchat2', message: messageData });
    storeMessage(messageData);
  } catch (error) {
    uploadStatus.textContent = `Upload failed: ${error.message}`;
    setTimeout(() => uploadStatus.remove(), 3000);
  } finally {
    event.target.value = '';
  }
}

// Backup functions with Puter.js
async function uploadDatabaseToPuter() {
  if (!db) {
    alert("Database not ready");
    return;
  }

  const status = document.createElement('div');
  status.className = 'backup-status';
  status.textContent = "Preparing backup...";
  document.getElementById('messages').appendChild(status);

  try {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();

    request.onsuccess = async () => {
      const messages = request.result;
      const backupBlob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      const backupName = `catchat-backup-${Date.now()}.json`;
      const usePuter = await shouldUsePuter();
      if (usePuter) {
        status.textContent = "Uploading backup...";
        const backupItem = await showPuterSavePicker(backupBlob, backupName);
        const savedPath = backupItem.path || backupName;
        const savedUrl = resolvePuterReadUrl(backupItem, '');
        localStorage.setItem('catchat2-last-backup-path', savedPath);
        if (savedUrl) {
          localStorage.setItem('catchat2-last-backup-url', savedUrl);
        }
        status.textContent = `Backup successful: ${savedPath}`;
      } else {
        downloadBlobLocally(backupBlob, backupName);
        status.textContent = `Backup downloaded locally: ${backupName}`;
      }
      setTimeout(() => status.remove(), 3000);
    };

    request.onerror = () => {
      status.textContent = "Failed to prepare backup";
      setTimeout(() => status.remove(), 3000);
    };
  } catch (error) {
    status.textContent = `Backup failed: ${error.message}`;
    setTimeout(() => status.remove(), 3000);
  }
}

async function loadDatabaseFromPuter() {
  const status = document.createElement('div');
  status.className = 'restore-status';
  status.textContent = "Restoring backup...";
  document.getElementById('messages').appendChild(status);

  try {
    let backupText = '';
    const usePuter = await shouldUsePuter();
    if (usePuter) {
      const pickedBackup = await showPuterOpenPicker();
      const backupUrl = resolvePuterReadUrl(
        pickedBackup,
        localStorage.getItem('catchat2-last-backup-url') || ''
      );

      if (!backupUrl) {
        throw new Error('Could not open selected backup file');
      }

      const backupResponse = await fetch(backupUrl);
      if (!backupResponse.ok) {
        throw new Error('Failed to download backup file');
      }

      backupText = await backupResponse.text();
    } else {
      const localFile = await pickLocalFile('.json,application/json');
      backupText = await localFile.text();
    }

    const messages = JSON.parse(backupText);

    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    // Clear existing messages before adding new ones
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        const putPromises = messages.map(msg => {
          return new Promise((res, rej) => {
            const putRequest = store.put(msg);
            putRequest.onsuccess = res;
            putRequest.onerror = rej;
          });
        });

        Promise.all(putPromises)
          .then(() => {
            status.textContent = "Restore successful!";
            // Clear current DOM messages and reload from DB to ensure consistency
            document.getElementById('messages').innerHTML = '';
            lastMessageId = 0; // Reset lastMessageId
            loadMessages();
            setTimeout(() => status.remove(), 3000);
            resolve();
          })
          .catch(err => {
            console.error("Error during message put:", err);
            status.textContent = "Partial restore completed or failed";
            document.getElementById('messages').innerHTML = ''; // Clear anyway
            lastMessageId = 0;
            loadMessages(); // Load whatever was restored
            setTimeout(() => status.remove(), 3000);
            reject(err); // Propagate error
          });
      };
      clearRequest.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    status.textContent = `Restore failed: ${error.message}`;
    setTimeout(() => status.remove(), 3000);
  }
}

// Utilities
function playNotificationSound() {
  try {
    const audio = new Audio('/src/ding.mp3'); // Make sure this path is correct relative to your HTML
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play prevented or error:', e));
  } catch (e) {
    console.log('Failed to play sound:', e);
  }
}

function notify(message) {
  try {
    const isBackground = typeof document !== 'undefined'
      ? document.visibilityState !== 'visible'
      : true;
    if (isBackground && Notification.permission === 'granted') {
      new Notification('New message', { body: message });
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

// Initialize application
async function initializeApp() {
  try {
    setLoadingProgress(5, 'Loading page...');
    document.getElementById('connectionStatus').textContent = "Initializing...";
    await initializeDatabase();
    setLoadingProgress(25, 'Database ready...');
    // Wait for the custom elements to be defined before setting up listeners
    // This is the key fix for the race condition
    await Promise.all([
      window.customElements.whenDefined('md-filled-button'),
      window.customElements.whenDefined('md-text-button'),
      window.customElements.whenDefined('md-filled-text-field')
    ]);
    setLoadingProgress(45, 'UI components ready...');

    await initializeDrone();
    setupRoomHandlers();
    await loadMessages();
    setLoadingProgress(92, 'Messages loaded...');
    await requestNotificationPermission();
    setLoadingProgress(98, 'Finalizing...');

    setupEventListeners();
    setLoadingProgress(100, 'Ready');
    hideLoadingOverlay();

  } catch (error) {
    console.error('Initialization failed:', error);
    document.getElementById('connectionStatus').textContent = "Initialization failed";
    document.getElementById('reconnectButton').style.display = 'block';
    setLoadingProgress(100, 'Initialization failed');
  }
}

// KaiOS navigation
const kaiosNavState = {
  focusIndex: 0,
  focusables: [],
  zoom: 1
};

function getKaiOSFocusableElements() {
  const messages = document.getElementById('messages');
  const inputField = document.getElementById('input');
  const uploadButton = document.getElementById('uploadButton');
  const downloadButton = document.getElementById('downloadButton');
  const fileUploadButton = document.getElementById('fileUploadButton');
  const sendButton = document.getElementById('sendButton');
  const reconnectButton = document.getElementById('reconnectButton');

  const ordered = [
    messages,
    inputField,
    uploadButton,
    downloadButton,
    fileUploadButton,
    sendButton,
    reconnectButton
  ];

  return ordered.filter((element) => {
    if (!element) {
      return false;
    }

    if (element.disabled) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input' && element.type === 'file') {
      return false;
    }

    if (element.tabIndex < 0) {
      return false;
    }

    return element.getClientRects().length > 0;
  });
}

function refreshKaiOSFocusables() {
  kaiosNavState.focusables = getKaiOSFocusableElements();

  kaiosNavState.focusables.forEach((element) => {
    if (element.dataset.kaiosBound) {
      return;
    }

    element.addEventListener('focus', () => {
      const index = kaiosNavState.focusables.indexOf(element);
      if (index !== -1) {
        kaiosNavState.focusIndex = index;
      }
    });

    element.dataset.kaiosBound = 'true';
  });
}

function focusKaiOSElement(index) {
  refreshKaiOSFocusables();

  if (!kaiosNavState.focusables.length) {
    return;
  }

  const clampedIndex = (index + kaiosNavState.focusables.length) % kaiosNavState.focusables.length;
  kaiosNavState.focusIndex = clampedIndex;
  kaiosNavState.focusables[clampedIndex].focus();
}

function clickKaiOSFocusedElement() {
  refreshKaiOSFocusables();
  const target = kaiosNavState.focusables[kaiosNavState.focusIndex];
  if (target) {
    target.click();
  }
}

function applyKaiOSZoom() {
  document.body.style.zoom = String(kaiosNavState.zoom.toFixed(2));
}

function adjustKaiOSZoom(delta) {
  const nextZoom = Math.min(1.4, Math.max(0.8, kaiosNavState.zoom + delta));
  if (nextZoom === kaiosNavState.zoom) {
    return;
  }

  kaiosNavState.zoom = nextZoom;
  applyKaiOSZoom();
}

function scrollMessages(direction) {
  const messages = document.getElementById('messages');
  if (!messages) {
    return false;
  }

  const maxScrollTop = messages.scrollHeight - messages.clientHeight;
  const current = messages.scrollTop;
  const delta = 48 * direction;
  const next = Math.max(0, Math.min(maxScrollTop, current + delta));
  messages.scrollTop = next;
  return next !== current;
}

function handleKaiOSNavigation(event) {
  const key = event.key;
  const keyCode = event.keyCode;

  const isUp = key === 'ArrowUp' || key === 'Up' || keyCode === 38;
  const isDown = key === 'ArrowDown' || key === 'Down' || keyCode === 40;
  const isSelect = key === 'Enter' || keyCode === 13;
  const isSoftLeft = key === 'SoftLeft' || key === 'F1' || keyCode === 112;
  const isSoftRight = key === 'SoftRight' || key === 'F2' || keyCode === 113;

  const activeElement = document.activeElement;
  const activeId = activeElement ? activeElement.id : '';
  const isInputFocused = activeId === 'input';
  const isMessagesFocused = activeId === 'messages';

  if (isSoftLeft) {
    event.preventDefault();
    window.history.back();
    return;
  }

  if (isSoftRight) {
    event.preventDefault();
    const inputField = document.getElementById('input');
    if (inputField && document.activeElement === inputField) {
      inputField.blur();
    }
    return;
  }

  if (isSelect && isInputFocused) {
    return;
  }

  if (isUp || isDown) {
    const direction = isUp ? -1 : 1;
    if (isMessagesFocused) {
      const didScroll = scrollMessages(direction);
      if (didScroll) {
        event.preventDefault();
        return;
      }
    }

    event.preventDefault();
    focusKaiOSElement(kaiosNavState.focusIndex + direction);
    return;
  }

  if (isSelect) {
    event.preventDefault();
    clickKaiOSFocusedElement();
  }
}

function setupKaiOSNavigation() {
  refreshKaiOSFocusables();
  applyKaiOSZoom();
  window.addEventListener('keydown', handleKaiOSNavigation);
  window.addEventListener('load', () => {
    refreshKaiOSFocusables();
    if (!document.activeElement || document.activeElement === document.body) {
      focusKaiOSElement(kaiosNavState.focusIndex);
    }
  });
}

// Event listeners
function setupEventListeners() {
  const sendButton = document.getElementById('sendButton');
  const inputField = document.getElementById('input');
  const fileUploadButton = document.getElementById('fileUploadButton');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadButton');
  const downloadButton = document.getElementById('downloadButton');
  const reconnectButton = document.getElementById('reconnectButton');

  sendButton.addEventListener('click', () => sendMessage());
  inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  fileUploadButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFileUpload(e));
  uploadButton.addEventListener('click', () => uploadDatabaseToPuter());
  downloadButton.addEventListener('click', () => loadDatabaseFromPuter());
  reconnectButton.addEventListener('click', () => initializeApp());
}

// Start the app
document.addEventListener('DOMContentLoaded', () => {
  if (isProductionHost()) {
    setModeBanner('cloud');
  } else {
    setModeBanner('local', 'non-production environment');
  }
  setLoadingProgress(12, 'Preparing app...');
  initializeApp();
  setupKaiOSNavigation();
});

window.addEventListener('load', () => {
  setLoadingProgress(18, 'Page assets loaded...');
});
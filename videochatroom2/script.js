const DEFAULT_CONFIG = {
	apiKey: '',
	callerId: '',
	calleeId: ''
};

const statusEl = document.getElementById('status');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleCamBtn = document.getElementById('toggleCamBtn');
const apiKeyInput = document.getElementById('apiKey');
const callerIdInput = document.getElementById('callerId');
const calleeIdInput = document.getElementById('calleeId');

let comzy = null;
let callStarted = false;
let micMuted = false;
let camMuted = false;

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

function setStatus(message, isError = false) {
	statusEl.textContent = message;
	statusEl.style.color = isError ? '#ff8a8a' : '#9dd89f';
}

function setControlsForCallState(isActive) {
	joinBtn.disabled = isActive;
	leaveBtn.disabled = !isActive;
	toggleMicBtn.disabled = !isActive;
	toggleCamBtn.disabled = !isActive;
}

function ensureComzyAvailable() {
	const hasComzy = typeof window.Comzy !== 'undefined';
	if (!hasComzy) {
		setStatus('Comzy SDK not loaded', true);
	}
	return hasComzy;
}

function readConfigFromInputs() {
	return {
		apiKey: apiKeyInput.value.trim(),
		callerId: callerIdInput.value.trim(),
		calleeId: calleeIdInput.value.trim()
	};
}

function validateConfig(config) {
	if (!config.apiKey) {
		setStatus('Enter your Comzy API key', true);
		apiKeyInput.focus();
		return false;
	}

	if (!config.callerId) {
		setStatus('Enter your ID', true);
		callerIdInput.focus();
		return false;
	}

	if (!config.calleeId) {
		setStatus('Enter your contact ID', true);
		calleeIdInput.focus();
		return false;
	}

	if (config.callerId === config.calleeId) {
		setStatus('Your ID and Contact ID must be different', true);
		calleeIdInput.focus();
		return false;
	}

	return true;
}

function attachComzyEvents(instance) {
	instance.on('callStarted', () => {
		callStarted = true;
		setControlsForCallState(true);
		setStatus('Call connected');
	});

	instance.on('callEnded', () => {
		callStarted = false;
		micMuted = false;
		camMuted = false;
		toggleMicBtn.textContent = 'Mute Mic';
		toggleCamBtn.textContent = 'Turn Off Cam';
		setControlsForCallState(false);
		setStatus('Call ended');
	});

	instance.on('userJoined', () => {
		setStatus('Contact joined');
	});

	instance.on('userLeft', () => {
		setStatus('Contact left');
	});

	instance.on('connectionStateChange', state => {
		if (!callStarted) {
			setStatus(`State: ${state}`);
		}
	});

	instance.on('error', error => {
		setStatus(`Error: ${error.message || 'Unknown error'}`, true);
	});
}

function initializeComzy(config) {
	if (!comzy) {
		comzy = new window.Comzy();
		attachComzyEvents(comzy);
	}

	comzy.init(config.apiKey, config.callerId, config.calleeId);
}

function startCall() {
	if (callStarted) return;
	if (!ensureComzyAvailable()) return;

	const config = readConfigFromInputs();
	if (!validateConfig(config)) return;

	try {
		setStatus('Starting call...');
		initializeComzy(config);
		comzy.startCall('#localVideo', '#remoteVideo');
	} catch (error) {
		setStatus(`Failed to start call: ${error.message || 'Unknown error'}`, true);
	}
}

function endCall() {
	if (!comzy || !callStarted) return;

	try {
		comzy.endCall();
	} catch (error) {
		setStatus(`Failed to end call: ${error.message || 'Unknown error'}`, true);
	}
}

function toggleMic() {
	if (!comzy || !callStarted) return;

	try {
		const enabled = comzy.toggleAudio();
		micMuted = !enabled;
		toggleMicBtn.textContent = micMuted ? 'Unmute Mic' : 'Mute Mic';
	} catch (error) {
		setStatus(`Mic toggle failed: ${error.message || 'Unknown error'}`, true);
	}
}

function toggleCamera() {
	if (!comzy || !callStarted) return;

	try {
		const enabled = comzy.toggleVideo();
		camMuted = !enabled;
		toggleCamBtn.textContent = camMuted ? 'Turn On Cam' : 'Turn Off Cam';
	} catch (error) {
		setStatus(`Camera toggle failed: ${error.message || 'Unknown error'}`, true);
	}
}

window.addEventListener('load', () => {
	apiKeyInput.value = DEFAULT_CONFIG.apiKey;
	callerIdInput.value = DEFAULT_CONFIG.callerId;
	calleeIdInput.value = DEFAULT_CONFIG.calleeId;

	setLoadingProgress(18, 'Loading page...');
	setTimeout(() => setLoadingProgress(46, 'Loading Comzy SDK...'), 100);
	setTimeout(() => setLoadingProgress(74, 'Preparing controls...'), 200);
	setTimeout(() => {
		setLoadingProgress(100, 'Ready');
		hideLoadingOverlay();
	}, 320);

	setControlsForCallState(false);
	if (!ensureComzyAvailable()) return;
	setStatus('Ready. Enter API key + IDs to start.', false);
});

joinBtn.addEventListener('click', startCall);
leaveBtn.addEventListener('click', endCall);
toggleMicBtn.addEventListener('click', toggleMic);
toggleCamBtn.addEventListener('click', toggleCamera);

const AGORA_CONFIG = {
	appId: '5f10b8d038114e4494671eba6636a671',
	channel: 'catchat',
	token: null
};

const statusEl = document.getElementById('status');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleCamBtn = document.getElementById('toggleCamBtn');
const remotePlayersEl = document.getElementById('remotePlayers');

let client = null;
let localTracks = {
	audioTrack: null,
	videoTrack: null
};
let joined = false;
let micMuted = false;
let camMuted = false;

function isLikelyAgoraAppId(value) {
	return /^[a-fA-F0-9]{32}$/.test(value);
}

function isLikelyRtcToken(value) {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();
	if (!trimmed) return false;

	// Web RTC tokens are usually long encoded strings (often starting with "006").
	return trimmed.length > 80 || trimmed.startsWith('006');
}

function getEffectiveToken() {
	if (AGORA_CONFIG.token === null || AGORA_CONFIG.token === undefined) {
		return null;
	}

	if (typeof AGORA_CONFIG.token !== 'string') {
		return AGORA_CONFIG.token;
	}

	const trimmed = AGORA_CONFIG.token.trim();
	return trimmed === '' ? null : trimmed;
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

function setStatus(message, isError = false) {
	statusEl.textContent = message;
	statusEl.style.color = isError ? '#ff8a8a' : '#9dd89f';
}

function setControlsForJoinState(isJoined) {
	joinBtn.disabled = isJoined;
	leaveBtn.disabled = !isJoined;
	toggleMicBtn.disabled = !isJoined;
	toggleCamBtn.disabled = !isJoined;
}

function ensureAgoraAvailable() {
	const hasAgora = typeof window.AgoraRTC !== 'undefined';
	if (!hasAgora) {
		setStatus('Agora SDK not loaded', true);
	}
	return hasAgora;
}

function validateConfig() {
	if (!AGORA_CONFIG.appId || AGORA_CONFIG.appId === 'YOUR_AGORA_APP_ID') {
		setStatus('Set AGORA_CONFIG.appId in script.js', true);
		return false;
	}

	if (!isLikelyAgoraAppId(AGORA_CONFIG.appId)) {
		setStatus('Invalid App ID format: expected 32 hex chars', true);
		return false;
	}

	if (!AGORA_CONFIG.channel || !AGORA_CONFIG.channel.trim()) {
		setStatus('Set a non-empty channel in AGORA_CONFIG.channel', true);
		return false;
	}

	const effectiveToken = getEffectiveToken();
	if (effectiveToken !== null && !isLikelyRtcToken(effectiveToken)) {
		setStatus('Token format looks invalid. Use a real RTC token or null.', true);
		return false;
	}

	return true;
}

function createRemoteTile(user) {
	const wrapper = document.createElement('div');
	wrapper.className = 'remote-player-tile';
	wrapper.id = `remote-wrapper-${user.uid}`;

	const player = document.createElement('div');
	player.className = 'video-player';
	player.id = `remote-player-${user.uid}`;

	const label = document.createElement('span');
	label.className = 'video-label';
	label.textContent = `Guest ${user.uid}`;

	wrapper.appendChild(player);
	wrapper.appendChild(label);
	remotePlayersEl.appendChild(wrapper);

	return player.id;
}

function removeRemoteTile(uid) {
	const wrapper = document.getElementById(`remote-wrapper-${uid}`);
	if (wrapper) {
		wrapper.remove();
	}
}

async function handleUserPublished(user, mediaType) {
	await client.subscribe(user, mediaType);

	if (mediaType === 'video') {
		const playerId = createRemoteTile(user);
		user.videoTrack.play(playerId);
	}

	if (mediaType === 'audio') {
		user.audioTrack.play();
	}
}

function handleUserUnpublished(user) {
	removeRemoteTile(user.uid);
}

function handleUserLeft(user) {
	removeRemoteTile(user.uid);
}

async function joinRoom() {
	if (joined) return;
	if (!ensureAgoraAvailable() || !validateConfig()) return;

	try {
		const effectiveToken = getEffectiveToken();
		setStatus('Joining room...');
		client = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

		client.on('user-published', handleUserPublished);
		client.on('user-unpublished', handleUserUnpublished);
		client.on('user-left', handleUserLeft);

		await client.join(AGORA_CONFIG.appId, AGORA_CONFIG.channel, effectiveToken, null);
		const [audioTrack, videoTrack] = await window.AgoraRTC.createMicrophoneAndCameraTracks();
		localTracks.audioTrack = audioTrack;
		localTracks.videoTrack = videoTrack;

		videoTrack.play('local-player');
		await client.publish([audioTrack, videoTrack]);

		joined = true;
		setControlsForJoinState(true);
		setStatus(`Connected to ${AGORA_CONFIG.channel}`);
	} catch (error) {
		console.error('Failed to join room:', error);

		const rawMessage = String(error?.message || 'Unknown error');
		if (/invalid vendor key|can not find appid/i.test(rawMessage)) {
			setStatus('Join failed: App ID not found. Check Agora Console App ID.', true);
			return;
		}

		if (/invalid token|token/i.test(rawMessage)) {
			setStatus('Join failed: invalid token. Use RTC token or null.', true);
			return;
		}

		setStatus(`Join failed: ${rawMessage}`, true);
	}
}

async function leaveRoom() {
	if (!client || !joined) return;

	try {
		for (const trackName of Object.keys(localTracks)) {
			const track = localTracks[trackName];
			if (track) {
				track.stop();
				track.close();
				localTracks[trackName] = null;
			}
		}

		await client.leave();
		remotePlayersEl.innerHTML = '';
		document.getElementById('local-player').innerHTML = '';

		joined = false;
		micMuted = false;
		camMuted = false;
		toggleMicBtn.textContent = 'Mute Mic';
		toggleCamBtn.textContent = 'Turn Off Cam';
		setControlsForJoinState(false);
		setStatus('Disconnected');
	} catch (error) {
		console.error('Failed to leave room:', error);
		setStatus(`Leave failed: ${error.message || 'Unknown error'}`, true);
	}
}

async function toggleMic() {
	if (!localTracks.audioTrack) return;

	micMuted = !micMuted;
	await localTracks.audioTrack.setEnabled(!micMuted);
	toggleMicBtn.textContent = micMuted ? 'Unmute Mic' : 'Mute Mic';
}

async function toggleCamera() {
	if (!localTracks.videoTrack) return;

	camMuted = !camMuted;
	await localTracks.videoTrack.setEnabled(!camMuted);
	toggleCamBtn.textContent = camMuted ? 'Turn On Cam' : 'Turn Off Cam';
}

window.addEventListener('load', () => {
	setLoadingProgress(18, 'Loading page...');
	setTimeout(() => setLoadingProgress(46, 'Loading Agora SDK...'), 100);
	setTimeout(() => setLoadingProgress(74, 'Preparing controls...'), 200);
	setTimeout(() => {
		setLoadingProgress(100, 'Ready');
		hideLoadingOverlay();
	}, 320);

	setControlsForJoinState(false);
	if (!ensureAgoraAvailable()) return;
	if (AGORA_CONFIG.appId === 'YOUR_AGORA_APP_ID') {
		setStatus('Set AGORA_CONFIG.appId to enable calls', true);
	}
});

joinBtn.addEventListener('click', joinRoom);
leaveBtn.addEventListener('click', leaveRoom);
toggleMicBtn.addEventListener('click', toggleMic);
toggleCamBtn.addEventListener('click', toggleCamera);

const ROOM_URLS = {
	room1: '../videochatroom1/',
	room2: '../videochatroom2/',
	room3: '../videochatroom3/'
};

const openRoom1Button = document.getElementById('openRoom1');
const openRoom2Button = document.getElementById('openRoom2');
const openRoom3Button = document.getElementById('openRoom3');
const backButton = document.getElementById('goBack');

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

function openRoom(roomLabel, roomUrl) {
	setLoadingProgress(20, `Opening ${roomLabel}...`);
	setTimeout(() => setLoadingProgress(55, 'Preparing redirect...'), 120);
	setTimeout(() => {
		setLoadingProgress(100, 'Redirecting...');
		window.location.href = roomUrl;
	}, 250);
}

openRoom1Button.addEventListener('click', () => openRoom('Room 1', ROOM_URLS.room1));
openRoom2Button.addEventListener('click', () => openRoom('Room 2', ROOM_URLS.room2));
openRoom3Button.addEventListener('click', () => openRoom('Room 3', ROOM_URLS.room3));
backButton.addEventListener('click', () => window.history.back());
window.addEventListener('load', () => {
	setLoadingProgress(15, 'Loading page...');
	setTimeout(() => setLoadingProgress(45, 'Preparing controls...'), 90);
	setTimeout(() => setLoadingProgress(75, 'Almost ready...'), 180);
	setTimeout(() => {
		setLoadingProgress(100, 'Ready');
		hideLoadingOverlay();
	}, 300);
});
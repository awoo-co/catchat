const VIDEOCHAT_URL = 'https://catchat-videochat.vercel.app';

const openButton = document.getElementById('openVideochat');
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

function openVideochat() {
	setLoadingProgress(20, 'Opening video chat...');
	setTimeout(() => setLoadingProgress(55, 'Preparing redirect...'), 120);
	setTimeout(() => {
		setLoadingProgress(100, 'Redirecting...');
		window.location.href = VIDEOCHAT_URL;
	}, 250);
}

openButton.addEventListener('click', openVideochat);
backButton.addEventListener('click', () => window.history.back());

const kaiosButtons = [openButton, backButton];
let focusIndex = 0;

function focusButtonAt(index) {
	const clampedIndex = (index + kaiosButtons.length) % kaiosButtons.length;
	focusIndex = clampedIndex;
	kaiosButtons[clampedIndex].focus();
}

function handleKaiOSNavigation(event) {
	const key = event.key;
	const keyCode = event.keyCode;

	const isUp = key === 'ArrowUp' || key === 'Up' || keyCode === 38;
	const isDown = key === 'ArrowDown' || key === 'Down' || keyCode === 40;
	const isSelect = key === 'Enter' || keyCode === 13;
	const isSoftLeft = key === 'SoftLeft' || key === 'F1' || keyCode === 112;
	const isSoftRight = key === 'SoftRight' || key === 'F2' || keyCode === 113;

	if (isUp) {
		event.preventDefault();
		focusButtonAt(focusIndex - 1);
		return;
	}

	if (isDown) {
		event.preventDefault();
		focusButtonAt(focusIndex + 1);
		return;
	}

	if (isSelect || isSoftLeft) {
		event.preventDefault();
		kaiosButtons[focusIndex].click();
		return;
	}

	if (isSoftRight) {
		event.preventDefault();
		window.history.back();
	}
}

kaiosButtons.forEach((button, index) => {
	button.addEventListener('focus', () => {
		focusIndex = index;
	});
});

window.addEventListener('keydown', handleKaiOSNavigation);
window.addEventListener('load', () => {
	setLoadingProgress(15, 'Loading page...');
	setTimeout(() => setLoadingProgress(45, 'Preparing controls...'), 90);
	setTimeout(() => setLoadingProgress(75, 'Almost ready...'), 180);
	setTimeout(() => {
		setLoadingProgress(100, 'Ready');
		hideLoadingOverlay();
	}, 300);

	focusButtonAt(focusIndex);
});
const VIDEOCHAT_URL = 'https://catchat-videochat.vercel.app';

const openButton = document.getElementById('openVideochat');
const backButton = document.getElementById('goBack');

function openVideochat() {
	window.location.href = VIDEOCHAT_URL;
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
	focusButtonAt(focusIndex);
});
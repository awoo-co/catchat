function setLoadingProgress(percent, label) {
  const boundedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const loadingBar = document.getElementById('loadingBar');
  const loadingPercent = document.getElementById('loadingPercent');
  const loadingLabel = document.getElementById('loadingLabel');

  if (loadingBar) {
    loadingBar.style.width = boundedPercent + '%';
  }

  if (loadingPercent) {
    loadingPercent.textContent = boundedPercent + '%';
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

window.addEventListener('load', () => {
  setLoadingProgress(15, 'Loading page...');
  setTimeout(() => setLoadingProgress(45, 'Preparing controls...'), 90);
  setTimeout(() => setLoadingProgress(75, 'Almost ready...'), 180);
  setTimeout(() => {
    setLoadingProgress(100, 'Ready');
    hideLoadingOverlay();
  }, 300);
});
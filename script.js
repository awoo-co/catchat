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

function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
}

function navigateWithLoading(url, label) {
  showLoadingOverlay();
  setLoadingProgress(60, label || 'Opening page...');

  requestAnimationFrame(() => {
    setLoadingProgress(85, 'Starting destination...');
    setTimeout(() => {
      window.location.href = url;
    }, 120);
  });
}

document.getElementById('server1').addEventListener('click', function() {
  navigateWithLoading('catchat1/index.html', 'Opening Server 1...');
});

document.getElementById('server2').addEventListener('click', function() {
  navigateWithLoading('catchat2/index.html', 'Opening Server 2...');
});

document.getElementById('server3').addEventListener('click', function() {
  navigateWithLoading('catchat3/index.html', 'Opening Server 3...');
});

document.getElementById('videochat').addEventListener('click', function() {
  navigateWithLoading('videochat/index.html', 'Opening Video Chat...');
});

const kaiosButtons = Array.from(document.querySelectorAll('.kaios-button'));
let currentFocusIndex = 0;

function focusButtonAt(index) {
  if (!kaiosButtons.length) {
    return;
  }

  const clampedIndex = (index + kaiosButtons.length) % kaiosButtons.length;
  currentFocusIndex = clampedIndex;
  kaiosButtons[clampedIndex].focus();
}

function clickFocusedButton() {
  if (!kaiosButtons.length) {
    return;
  }

  kaiosButtons[currentFocusIndex].click();
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
    focusButtonAt(currentFocusIndex - 1);
    return;
  }

  if (isDown) {
    event.preventDefault();
    focusButtonAt(currentFocusIndex + 1);
    return;
  }

  if (isSelect || isSoftLeft) {
    event.preventDefault();
    clickFocusedButton();
    return;
  }

  if (isSoftRight) {
    event.preventDefault();
    window.history.back();
  }
}

kaiosButtons.forEach((button, index) => {
  button.addEventListener('focus', () => {
    currentFocusIndex = index;
  });
});

window.addEventListener('keydown', handleKaiOSNavigation);
window.addEventListener('load', () => {
  setLoadingProgress(100, 'Ready');
  hideLoadingOverlay();
  focusButtonAt(currentFocusIndex);
});

document.addEventListener('DOMContentLoaded', () => {
  setLoadingProgress(20, 'Preparing interface...');
});

setLoadingProgress(5, 'Loading website...');

async function resetBrowserData() {
  localStorage.clear();
  sessionStorage.clear();

  if (window.indexedDB && indexedDB.databases) {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map((db) => {
        if (!db || !db.name) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          const request = indexedDB.deleteDatabase(db.name);
          request.onsuccess = resolve;
          request.onerror = resolve;
          request.onblocked = resolve;
        });
      })
    );
  }

  if (window.caches && caches.keys) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

document.getElementById('resetdata').addEventListener('click', async function() {
  const confirmed = window.confirm('Reset all stored data for this site?');
  if (!confirmed) {
    return;
  }

  try {
    await resetBrowserData();
    window.alert('Site data reset. The page will reload.');
    window.location.reload();
  } catch (error) {
    console.error('Failed to reset site data.', error);
    window.alert('Unable to reset all data. Try closing and reopening the browser.');
  }
});

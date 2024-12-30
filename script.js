document.getElementById('server1').addEventListener('click', function() {
  window.location.href = 'catchat1/index.html';
});

document.getElementById('server2').addEventListener('click', function() {
  window.location.href = 'catchat2/index.html';
});

document.getElementById('server3').addEventListener('click', function() {
  window.location.href = 'catchat3/index.html';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}
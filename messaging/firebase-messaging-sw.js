// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/7.6.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.6.1/firebase-messaging.js');

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAnWB8w5djDai7xUq8QmXvm43T8W4trW3w",
  authDomain: "chat-app64-eae61.firebaseapp.com",
  databaseURL: "https://chat-app64-eae61-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-app64-eae61",
  storageBucket: "chat-app64-eae61.appspot.com",
  messagingSenderId: "426477258139",
  appId: "1:426477258139:web:62c78f35810adc0b2f8d3e",
  measurementId: "G-YC9BFXBLDK"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);


// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = 'You have new message';
    const notificationOptions = {
        body: payload.data.message,
        icon: payload.data.icon
    };

    return self.registration.showNotification(notificationTitle,
        notificationOptions);
});




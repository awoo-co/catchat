const firebaseConfig = {
    apiKey: "AIzaSyDA0X9OkthCMMvhxXIwUvVjeqzjNNT8b_k",
    authDomain: "newvideo2212.firebaseapp.com",
    databaseURL: "https://newvideo2212-default-rtdb.firebaseio.com",
    projectId: "newvideo2212",
    storageBucket: "newvideo2212.appspot.com",
    messagingSenderId: "283500325791",
    appId: "1:283500325791:web:4715dfd7a607b511832baa"
  };

  firebase.initializeApp(firebaseConfig);

  const db = firebase.database();
  
  const username = prompt("Please Tell Us Your Name");
  
  function sendMessage(e) {
    e.preventDefault();
  
    // get values to be submitted
    const timestamp = Date.now();
    const messageInput = document.getElementById("message-input");
    const message = messageInput.value;
  
    // clear the input box
    messageInput.value = "";
  
    //auto scroll to bottom
    document
      .getElementById("messages")
      .scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  
    // create db collection and send in the data
    db.ref("messages/" + timestamp).set({
      username,
      message,
    });
  }
  
  const fetchChat = db.ref("messages/");
  
  fetchChat.on("child_added", function (snapshot) {
    const messages = snapshot.val();
    const message = `<li class=${
      username === messages.username ? "sent" : "receive"
    }><span>${messages.username}: </span>${messages.message}</li>`;
    // append the message on the page
    document.getElementById("messages").innerHTML += message;
  });
  
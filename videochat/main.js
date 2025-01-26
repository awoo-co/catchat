document.addEventListener("DOMContentLoaded", () => {
    const pages = {
        meetingSetup: document.getElementById("page-meeting-setup"),
        permissions: document.getElementById("page-permissions"),
        call: document.getElementById("page-call"),
    };

    let screenStream = null;
    let client, localStream;

    // Agora App ID and Token (Replace with your actual App ID and Token)
    const APP_ID = "5f10b8d038114e4494671eba6636a671"; // Replace with your Agora App ID
    const TOKEN = "3eabec5e3af84fe09409af2300f9ad4e"; // Replace with your Agora Token (optional, you can also use a temporary token)

    // Channel name (meeting ID)
    let channelName = "";

    // Function to navigate between pages
    function showPage(pageId) {
        Object.values(pages).forEach(page => page.classList.remove("active"));
        pages[pageId].classList.add("active");
    }

    // Function to initialize Agora client and join the channel
    function initAgora() {
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        client.init(APP_ID, () => {
            console.log("AgoraRTC client initialized");
            // Join the channel once initialized
            joinChannel();
        }, (err) => {
            console.error("AgoraRTC client init failed", err);
        });
    }

    // Function to join the Agora channel
    function joinChannel() {
        client.join(TOKEN, channelName, null, (uid) => {
            console.log("User " + uid + " joined channel");

            // Create and publish the local stream
            localStream = AgoraRTC.createStream({
                streamID: uid,
                audio: true,
                video: true,
                screen: false,
            });

            localStream.init(() => {
                console.log("Local stream initialized");

                // Display local stream
                localStream.play("video-container");

                // Publish the local stream
                client.publish(localStream, (err) => {
                    console.error("Publish local stream failed", err);
                });
            }, (err) => {
                console.error("Local stream initialization failed", err);
            });
        }, (err) => {
            console.error("Join channel failed", err);
        });
    }

    // Handle meeting setup form submission
    document.getElementById("meeting-form").addEventListener("submit", (e) => {
        e.preventDefault();

        const hostName = document.getElementById("hostName").value;
        const meetingName = document.getElementById("meetingName").value;
        channelName = document.getElementById("meetingID").value;

        // Store or send meeting details to the server if needed
        showPage("permissions");
    });

    // Handle permission check for audio and video
    document.getElementById("checkPermissions").addEventListener("click", () => {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then(() => {
                document.getElementById("status").textContent = "Permissions granted!";
                // After permission is granted, move to the call page and initialize Agora
                showPage("call");
                initAgora(); // Initialize Agora once permissions are granted
            })
            .catch(() => {
                document.getElementById("status").textContent = "Permissions denied. Please allow access.";
            });
    });

    // Screen Sharing Logic
    document.getElementById("startScreenShare").addEventListener("click", async () => {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            const videoContainer = document.getElementById("video-container");
            const video = document.createElement("video");
            video.srcObject = screenStream;
            video.autoplay = true;
            video.controls = false;
            video.style.width = "100%";

            videoContainer.innerHTML = ""; // Clear previous content
            videoContainer.appendChild(video);

            document.getElementById("startScreenShare").style.display = "none";
            document.getElementById("stopScreenShare").style.display = "block";
        } catch (err) {
            alert("Error sharing screen: " + err.message);
        }
    });

    document.getElementById("stopScreenShare").addEventListener("click", () => {
        if (screenStream) {
            const tracks = screenStream.getTracks();
            tracks.forEach((track) => track.stop());
            screenStream = null;

            document.getElementById("startScreenShare").style.display = "block";
            document.getElementById("stopScreenShare").style.display = "none";
            document.getElementById("video-container").innerHTML = ""; // Clear video container
        }
    });

    // End the call and return to meeting setup
    document.getElementById("endCall").addEventListener("click", () => {
        if (localStream) {
            client.leave(() => {
                localStream.close();
                console.log("User left the channel");
            }, (err) => {
                console.error("Leave channel failed", err);
            });
        }
        showPage("meetingSetup");
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const pages = {
        meetingSetup: document.getElementById("page-meeting-setup"),
        permissions: document.getElementById("page-permissions"),
        waitingRoom: document.getElementById("page-waiting-room"),
        call: document.getElementById("page-call"),
    };

    let screenStream = null;

    function showPage(pageId) {
        Object.values(pages).forEach(page => page.classList.remove("active"));
        pages[pageId].classList.add("active");
    }

    // Page Navigation
    document.getElementById("meeting-form").addEventListener("submit", (e) => {
        e.preventDefault();
        showPage("permissions");
    });

    document.getElementById("checkPermissions").addEventListener("click", () => {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then(() => {
                document.getElementById("status").textContent = "Permissions granted!";
                setTimeout(() => showPage("waitingRoom"), 1000);
            })
            .catch(() => {
                document.getElementById("status").textContent = "Permissions denied. Please allow access.";
            });
    });

    document.getElementById("leaveWaitingRoom").addEventListener("click", () => {
        showPage("meetingSetup");
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

    document.getElementById("endCall").addEventListener("click", () => {
        showPage("meetingSetup");
    });

    // Simulate host joining and switching to the call page
    setTimeout(() => {
        if (pages.waitingRoom.classList.contains("active")) {
            showPage("call");
        }
    }, 5000);
});

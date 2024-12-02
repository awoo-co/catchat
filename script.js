// Get references to the file input and message container
const fileInput = document.getElementById('fileInput');
const messagesContainer = document.getElementById('messages');

// Event listener for file input change
fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0]; // Get the first selected file
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const fileData = {
        type: 'file',
        filename: file.name,
        content: e.target.result, // This will be the base64-encoded string
        fileType: file.type,
        isImage: file.type.startsWith('image/')
      };

      // Display the uploaded file
      displayUploadedFile(fileData);
    };
    reader.readAsDataURL(file); // Read the file as a Data URL (base64)
  }
}

// Function to display the uploaded file in the messages container
function displayUploadedFile(fileData) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');

  if (fileData.isImage) {
    const img = document.createElement('img');
    img.src = fileData.content;
    img.alt = fileData.filename;
    img.style.maxWidth = '100%'; // Optional: Adjust image size
    messageDiv.appendChild(img);
  } else {
    // Handle non-image files (you could show a link or just text for them)
    messageDiv.textContent = `File uploaded: ${fileData.filename}`;
  }

  // Append the new message to the messages container
  messagesContainer.appendChild(messageDiv);

  // Scroll to the bottom of the messages container to show the latest message
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event listener for reset button to clear messages and reset chat state
document.getElementById('resetButton').addEventListener('click', resetChat);

function resetChat() {
  // Clear all messages in the messages container
  messagesContainer.innerHTML = '';

  // Reset file input (optional, but clears file input field)
  fileInput.value = '';
}

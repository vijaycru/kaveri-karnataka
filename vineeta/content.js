// === Create the main container ===
const container = document.createElement('div');
container.id = "voiceAssistantContainer";

const chatWindow = document.createElement('div');
chatWindow.id = "voiceAssistantChat";

const controlPanel = document.createElement('div');
controlPanel.id = "voiceAssistantControls";

const textInput = document.createElement('textarea');
textInput.id = "voiceAssistantInput";
textInput.placeholder = "Ask about registering a Hindu marriage online...";
textInput.autocomplete = "off";
textInput.autocorrect = "off";
textInput.autocapitalize = "off";
textInput.spellcheck = false;
textInput.rows = 1;
textInput.style.resize = "none";
textInput.style.overflow = "hidden";

const sendButton = document.createElement('button');
sendButton.id = "voiceAssistantSendButton";
sendButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="white">
  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
</svg>
`;

const micButton = document.createElement('button');
micButton.id = "voiceAssistantMicButton";
micButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="white">
  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zM5 11v2c0 3.07 2.13 5.64 5 6.32V22h4v-2.68c2.87-.68 5-3.25 5-6.32v-2h-2v2c0 2.48-2.02 4.5-4.5 4.5S7.5 15.48 7.5 13v-2H5z"/>
</svg>
`;

// Assemble the controls
controlPanel.appendChild(textInput);
controlPanel.appendChild(sendButton);
controlPanel.appendChild(micButton);

// Assemble the full container
container.appendChild(chatWindow);
container.appendChild(controlPanel);

// Add container to page
document.body.appendChild(container);

// Focus input automatically
textInput.focus();

// === Speech Recognition Setup ===
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-IN';

micButton.addEventListener('click', () => {
    recognition.start();
    micButton.classList.add('listening');
});

recognition.addEventListener('end', () => {
    micButton.classList.remove('listening');
});

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage(transcript, 'user');
    askOpenAI(transcript);
};

// === Typing and Sending ===
sendButton.addEventListener('click', () => {
    const typedQuestion = textInput.value.trim();
    if (typedQuestion) {
        addMessage(typedQuestion, 'user');
        askOpenAI(typedQuestion);
        textInput.value = '';
        autoExpandTextarea();
    }
});

textInput.addEventListener('input', autoExpandTextarea);

textInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
    }
});

function autoExpandTextarea() {
    textInput.style.height = 'auto';
    textInput.style.height = (textInput.scrollHeight) + 'px';
}

// === Main AI Request ===
async function askOpenAI(userQuestion) {
    const apiKey = ""; // 🔴 Replace this with your real API key!

    const typingInfo = addTypingMessage();

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: userQuestion }]
            })
        });

        const data = await response.json();
       	const aiAnswer = data.choices[0].message.content;
	const formattedAnswer = aiAnswer.replace(/\n/g, "<br>");
	updateTypingMessage(typingInfo.typingDiv, formattedAnswer, typingInfo.intervalId);
        //speakText(aiAnswer)
;

    } catch (error) {
        console.error(error);
        updateTypingMessage(typingInfo.typingDiv, "Sorry, I couldn't get an answer. Please try again later.", typingInfo.intervalId);
    }
}

// === Typing Animation
function addTypingMessage() {
    const typingDiv = document.createElement('div');
    typingDiv.className = `chatMessage ai typing`;
    typingDiv.innerText = "Assistant is typing";
    chatWindow.appendChild(typingDiv);
    smoothScroll();
    saveMessage("Assistant is typing...", 'ai');

    let dots = 0;
    const intervalId = setInterval(() => {
        dots = (dots + 1) % 4;
        typingDiv.innerText = "Assistant is typing" + '.'.repeat(dots);
    }, 500);

    return { typingDiv, intervalId };
}

function updateTypingMessage(typingDiv, newText, intervalId) {
    clearInterval(intervalId);
    typingDiv.classList.remove('typing');
    typingDiv.innerHTML = newText;
    updateSavedLastAIMessage(newText);
}

// === Voice Reply
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';

    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
        v.name.includes('Female') ||
        v.name.includes('Google UK English Female') ||
        v.lang.includes('en-GB') ||
        v.lang.includes('en-IN')
    );

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    speechSynthesis.speak(utterance);
}

// === Chat Functions
function addMessage(text, sender) {
    const message = document.createElement('div');
    message.className = `chatMessage ${sender}`;
    message.innerHTML = text;
    chatWindow.appendChild(message);
    smoothScroll();
    saveMessage(text, sender);
}

function smoothScroll() {
    chatWindow.scrollTo({
        top: chatWindow.scrollHeight,
        behavior: 'smooth'
    });
}

function saveMessage(text, sender) {
    let chatHistory = JSON.parse(localStorage.getItem('kaveriChatHistory')) || [];
    chatHistory.push({ text, sender });
    localStorage.setItem('kaveriChatHistory', JSON.stringify(chatHistory));
}

function updateSavedLastAIMessage(newText) {
    let chatHistory = JSON.parse(localStorage.getItem('kaveriChatHistory')) || [];
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].sender === 'ai') {
            chatHistory[i].text = newText;
            break;
        }
    }
    localStorage.setItem('kaveriChatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    let chatHistory = JSON.parse(localStorage.getItem('kaveriChatHistory')) || [];
    chatHistory.forEach(({ text, sender }) => {
        const message = document.createElement('div');
        message.className = `chatMessage ${sender}`;
        message.innerHTML = text;
        chatWindow.appendChild(message);
    });
    smoothScroll();
}

// === Welcome Message
function insertWelcomeMessage() {
    const welcomeText = `Hi! 👋<br><br>
We’re <a href="https://zencitizen.in" target="_blank"><strong>Zen Citizen</strong></a> — a volunteer group helping make government services easier to access.<br><br> This chatbot shares tips and answers questions on registering a Hindu marriage online on the Kaveri portal. <em>We plan to expand to more services soon.</em><br><br>
Hope you have a smooth experience here. 🙌`;
    addMessage(welcomeText, 'ai');
}

loadChatHistory();
insertWelcomeMessage();

// Function to add thumbs up / thumbs down feedback after AI response
function addFeedbackButtons(messageDiv) {
    // Create thumbs-up and thumbs-down buttons
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-buttons';

    const thumbsUp = document.createElement('button');
    thumbsUp.innerHTML = "👍"; // Thumbs up icon
    thumbsUp.onclick = () => handleFeedback('thumbs-up');

    const thumbsDown = document.createElement('button');
    thumbsDown.innerHTML = "👎"; // Thumbs down icon
    thumbsDown.onclick = () => handleFeedback('thumbs-down');

    feedbackDiv.appendChild(thumbsUp);
    feedbackDiv.appendChild(thumbsDown);

    // Append the feedback buttons below the AI's response
    messageDiv.appendChild(feedbackDiv);
}

// Function to handle the feedback response
function handleFeedback(feedbackType) {
    console.log("User feedback: " + feedbackType); // Handle feedback logic here (store in analytics or backend)

    // You can track feedback here or send to an analytics server
    sendFeedbackToAnalytics(feedbackType); // Example function to send feedback data
}

// Example function to send feedback to your backend (or analytics server)
function sendFeedbackToAnalytics(feedbackType) {
    fetch('https://your-analytics-server.com/feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            feedback: feedbackType, // 'thumbs-up' or 'thumbs-down'
            timestamp: new Date().toISOString()
        })
    }).then(response => {
        if (response.ok) {
            console.log('Feedback sent successfully');
        }
    }).catch(err => {
        console.error('Error sending feedback:', err);
    });
}

// Example: After AI responds, you call this function to show the feedback buttons
function showAIResponse(responseText) {
    const chatWindow = document.getElementById('chatWindow'); // assuming you have a div to display chat
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chatMessage', 'ai');
    messageDiv.innerHTML = responseText;

    // Add the response message and feedback buttons to the chat window
    chatWindow.appendChild(messageDiv);
    addFeedbackButtons(messageDiv);
}


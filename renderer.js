const canvas = document.getElementById('slide-canvas');
const ctx = canvas.getContext('2d');

let slides = [];
let currentSlideIndex = 0;
let undoStack = [];
let redoStack = [];
let slideElements = [];

const synth = window.speechSynthesis;

let highContrastMode = false;
let fontSizeMultiplier = 1;

const slideTemplates = {
    'title': {
        background: '#f0f0f0',
        elements: [
            { type: 'text', content: 'Title Slide', x: 50, y: 100, font: 'bold 36px Arial', color: '#333' },
            { type: 'text', content: 'Subtitle', x: 50, y: 150, font: '24px Arial', color: '#333' }
        ]
    },
    'content': {
        background: '#ffffff',
        elements: [
            { type: 'text', content: 'Content Slide', x: 50, y: 50, font: 'bold 28px Arial', color: '#333' },
            { type: 'text', content: '• Bullet point 1', x: 50, y: 100, font: '18px Arial', color: '#333' },
            { type: 'text', content: '• Bullet point 2', x: 50, y: 130, font: '18px Arial', color: '#333' },
            { type: 'text', content: '• Bullet point 3', x: 50, y: 160, font: '18px Arial', color: '#333' }
        ]
    },
    'image': {
        background: '#ffffff',
        elements: [
            { type: 'text', content: 'Image Title', x: 50, y: 50, font: 'bold 36px Arial', color: '#000000' },
            { type: 'image', src: 'placeholder.png', x: 50, y: 100, width: 300, height: 200 }
        ]
    }
};

function saveState() {
    const currentState = {
        slides: slides.map(slide => ({...slide})),
        currentSlideIndex: currentSlideIndex
    };
    undoStack.push(JSON.stringify(currentState));
    redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push(JSON.stringify(slides));
        slides = JSON.parse(undoStack.pop());
        currentSlideIndex = Math.min(currentSlideIndex, slides.length - 1);
        loadSlide(currentSlideIndex);
    }
    updateUndoRedoButtons();
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.stringify(slides));
        slides = JSON.parse(redoStack.pop());
        currentSlideIndex = Math.min(currentSlideIndex, slides.length - 1);
        loadSlide(currentSlideIndex);
    }
    updateUndoRedoButtons();
}

function loadCanvasState(state) {
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = state;
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function createNewSlide() {
    saveState();
    const slide = {
        content: canvas.toDataURL(),
        elements: []
    };
    slides.push(slide);
    currentSlideIndex = slides.length - 1;
    clearSlide();
    updateSlideNavigation();

    // Send update to other users
    if (socket && socket.readyState === WebSocket.OPEN) {
        sendSlideUpdate(currentSlideIndex, slide.content);
    }
}

function updateSlideNavigation() {
    const slideNumber = document.getElementById('slideNumber');
    slideNumber.textContent = `Slide ${currentSlideIndex + 1} of ${slides.length}`;

    const thumbnails = document.getElementById('slideThumbnails');
    thumbnails.innerHTML = '';
    slides.forEach((slide, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        thumbnail.innerHTML = `<img src="${slide.content}" alt="Slide ${index + 1}">`;
        if (index === currentSlideIndex) {
            thumbnail.classList.add('active');
        }
        thumbnail.onclick = () => goToSlide(index);
        thumbnails.appendChild(thumbnail);
    });

    // Update navigation buttons
    document.getElementById('prevSlideBtn').disabled = currentSlideIndex === 0;
    document.getElementById('nextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
}

function goToSlide(index) {
    if (index >= 0 && index < slides.length) {
        saveState();
        currentSlideIndex = index;
        const slide = slides[currentSlideIndex];
        loadCanvasState(slide.content);
        renderSlideElements(slide.elements);
        updateSlideNavigation();
    }
}

function renderSlideElements(elements) {
    elements.forEach(element => {
        switch (element.type) {
            case 'text':
                ctx.font = element.font;
                ctx.fillStyle = element.color;
                ctx.fillText(element.content, element.x, element.y);
                break;
            case 'shape':
                ctx.strokeStyle = element.color;
                if (element.shape === 'rectangle') {
                    ctx.strokeRect(element.x, element.y, element.width, element.height);
                } else if (element.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                break;
            case 'image':
                const img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, element.x, element.y, element.width, element.height);
                };
                img.src = element.src;
                break;
        }
    });
}

function clearSlide() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
}

function addText() {
    const text = prompt('Enter text:');
    if (text) {
        saveState();
        ctx.font = '20px Arial';
        ctx.fillText(text, 50, 50);
        speakText("Text added: " + text);
    }
}

function addShape() {
    const shape = prompt('Enter shape type (rectangle, circle):');
    if (shape) {
        saveState();
        if (shape === 'rectangle') {
            ctx.strokeRect(50, 50, 100, 80);
        } else if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(100, 100, 50, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
}

function addImage() {
    const imageUrl = prompt('Enter image URL:');
    if (imageUrl) {
        const img = new Image();
        img.onload = function() {
            saveState();
            ctx.drawImage(img, 50, 50, 200, 200);
        }
        img.src = imageUrl;
    }
}

async function generateAIContent() {
    const prompt = prompt('Enter a prompt for AI content generation:');
    if (prompt) {
        try {
            clearSlide();
            const response = await window.electronAPI.generateContent(prompt);
            ctx.font = '24px Arial';
            ctx.fillStyle = '#333';

            const lines = response.split('\n');
            let y = 50;
            lines.forEach((line, index) => {
                if (index === 0) {
                    ctx.font = 'bold 32px Arial';
                    ctx.fillText(line, 50, y);
                    y += 60;
                    ctx.font = '24px Arial';
                } else {
                    const words = line.split(' ');
                    let lineText = '';
                    words.forEach(word => {
                        const testLine = lineText + word + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > canvas.width - 100) {
                            ctx.fillText(lineText, 50, y);
                            lineText = word + ' ';
                            y += 30;
                        } else {
                            lineText = testLine;
                        }
                    });
                    ctx.fillText(lineText, 50, y);
                    y += 30;
                }
            });
            saveState();
        } catch (error) {
            console.error('Error generating AI content:', error);
            alert('Failed to generate AI content. Please try again.');
        }
    }
}

function applyTemplate() {
    const templateName = document.getElementById('layoutSelector').value;
    if (slideTemplates[templateName]) {
        saveState();
        const template = slideTemplates[templateName];
        clearSlide();
        ctx.fillStyle = template.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        renderSlideElements(template.elements);
        slides[currentSlideIndex] = {
            content: canvas.toDataURL(),
            elements: [...template.elements]
        };
        updateSlideNavigation();
    } else {
        alert('Template not found');
    }
}

function startPresentation() {
    document.body.requestFullscreen();
    // Hide UI elements and show only the canvas
    // Implement slide navigation for presentation mode
}

function updateFormatting() {
    const font = document.getElementById('fontSelector').value;
    const fontSize = document.getElementById('fontSizeSelector').value;
    const color = document.getElementById('textColorPicker').value;

    ctx.font = `${fontSize}px ${font}`;
    ctx.fillStyle = color;
}

// Event listeners
document.getElementById('newSlideBtn').addEventListener('click', createNewSlide);
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('presentBtn').addEventListener('click', startPresentation);
document.getElementById('templateSelector').addEventListener('change', handleTemplateChange);
document.getElementById('nextSlideBtn').addEventListener('click', nextSlide);
document.getElementById('prevSlideBtn').addEventListener('click', previousSlide);
document.getElementById('deleteSlideBtn').addEventListener('click', deleteCurrentSlide);

document.getElementById('fontSelector').addEventListener('change', updateFormatting);
document.getElementById('fontSizeSelector').addEventListener('change', updateFormatting);
document.getElementById('textColorPicker').addEventListener('change', updateFormatting);
document.getElementById('boldBtn').addEventListener('click', () => {
    ctx.font = ctx.font.includes('bold') ? ctx.font.replace('bold ', '') : 'bold ' + ctx.font;
});
document.getElementById('italicBtn').addEventListener('click', () => {
    ctx.font = ctx.font.includes('italic') ? ctx.font.replace('italic ', '') : 'italic ' + ctx.font;
});

// Accessibility feature event listeners
document.getElementById('highContrastToggle').addEventListener('click', toggleHighContrast);
document.getElementById('speakSlideBtn').addEventListener('click', speakSlideContent);
document.getElementById('increaseFontBtn').addEventListener('click', () => adjustFontSize(true));
document.getElementById('decreaseFontBtn').addEventListener('click', () => adjustFontSize(false));

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'n') {
        createNewSlide();
    } else if (event.ctrlKey && event.key === 's') {
        savePresentation();
    } else if (event.ctrlKey && event.key === 'z') {
        undo();
    } else if (event.ctrlKey && event.key === 'y') {
        redo();
    }
});

// Add event listener for cursor movement
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    sendCursorPosition(x, y);
});

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    synth.speak(utterance);
}

function speakSlideContent() {
    const slideContent = getSlideContent(currentSlideIndex);
    speakText(`Slide ${currentSlideIndex + 1}: ${slideContent}`);
}

// Initialize
createNewSlide();
updateUndoRedoButtons();
updateSlideNavigation();

// Accessibility functions
function updateARIAAttributes() {
    canvas.setAttribute('aria-label', `Slide ${currentSlideIndex + 1} of ${slides.length}`);
    // Add more ARIA attributes to other elements as needed
}

function toggleHighContrast() {
    highContrastMode = !highContrastMode;
    document.body.classList.toggle('high-contrast');
    redrawSlide();
}

function adjustFontSize(increase) {
    fontSizeMultiplier += increase ? 0.1 : -0.1;
    fontSizeMultiplier = Math.max(0.5, Math.min(fontSizeMultiplier, 2));
    redrawSlide();
}

function speakSlideContent() {
    const slideContent = getSlideContent(currentSlideIndex);
    speakText(`Slide ${currentSlideIndex + 1}: ${slideContent}`);
}

function redrawSlide() {
    clearSlide();
    renderSlideElements(slides[currentSlideIndex].elements);
    updateARIAAttributes();
}

// Call updateARIAAttributes after initializing
updateARIAAttributes();

// Real-time collaboration setup
let socket;
let sessionId;
let userId;

function initializeCollaboration() {
    socket = new WebSocket('ws://your-websocket-server-url');
    userId = generateUserId(); // Implement this function to generate a unique user ID

    socket.onopen = () => {
        console.log('WebSocket connection established');
        joinSession();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
    };
}

function joinSession() {
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('session') || generateSessionId(); // Implement generateSessionId() function
    socket.send(JSON.stringify({ type: 'join', sessionId, userId }));
}

function handleIncomingMessage(data) {
    switch (data.type) {
        case 'slideUpdate':
            updateSlideContent(data.slideIndex, data.content);
            break;
        case 'cursorMove':
            updateCursorPosition(data.userId, data.x, data.y);
            break;
        // Add more cases for other types of updates
    }
}

function sendSlideUpdate(slideIndex, content) {
    socket.send(JSON.stringify({
        type: 'slideUpdate',
        sessionId,
        userId,
        slideIndex,
        content
    }));
}

function sendCursorPosition(x, y) {
    socket.send(JSON.stringify({
        type: 'cursorMove',
        sessionId,
        userId,
        x,
        y
    }));
}

// Call this function when the application starts
initializeCollaboration();

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
        redoStack.push(JSON.stringify({ slides, currentSlideIndex }));
        const prevState = JSON.parse(undoStack.pop());
        slides = prevState.slides;
        currentSlideIndex = prevState.currentSlideIndex;
        loadSlide(currentSlideIndex);
    }
    updateUndoRedoButtons();
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.stringify({ slides, currentSlideIndex }));
        const nextState = JSON.parse(redoStack.pop());
        slides = nextState.slides;
        currentSlideIndex = nextState.currentSlideIndex;
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

function createNewSlide(template = 'content') {
    saveState();
    const slide = {
        content: canvas.toDataURL(),
        elements: [...slideTemplates[template].elements],
        template: template
    };
    slides.push(slide);
    currentSlideIndex = slides.length - 1;
    clearSlide();
    renderSlideElements(slide.elements);
    updateSlideNavigation();
    sendSlideUpdate(currentSlideIndex, slide.content);

    // Create and add thumbnail
    const thumbnail = createThumbnail(slide.content);
    const thumbnailsContainer = document.getElementById('slide-thumbnails');
    thumbnailsContainer.appendChild(thumbnail);

    // Update slide count
    updateSlideCount();

    // Apply template-specific styles
    applyTemplateStyles(template);

    // Trigger Copilot suggestions for the new slide
    generateCopilotSuggestions(slide);

    // Update analytics
    updateAnalytics('slideCreated', { template: template });
}

function createThumbnail(slideContent) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.innerHTML = `<img src="${slideContent}" alt="Slide ${slides.length}">`;
    thumbnail.onclick = () => goToSlide(slides.length - 1);
    return thumbnail;
}

function updateSlideCount() {
    const slideCountElement = document.getElementById('slide-count');
    slideCountElement.textContent = `Slide ${currentSlideIndex + 1} of ${slides.length}`;
}

function updateSlideNavigation() {
    const slideNumber = document.getElementById('slideNumber');
    slideNumber.textContent = `Slide ${currentSlideIndex + 1} of ${slides.length}`;

    const thumbnails = document.getElementById('slide-thumbnails');
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
        const newElement = {
            type: 'text',
            content: text,
            x: 50,
            y: 50,
            font: '20px Arial',
            color: '#000000'
        };
        slides[currentSlideIndex].elements.push(newElement);
        renderSlideElements([newElement]);
        speakText("Text added: " + text);
    }
}

function addShape() {
    const shape = prompt('Enter shape type (rectangle, circle):');
    if (shape) {
        saveState();
        const newElement = {
            type: 'shape',
            shape: shape,
            x: 50,
            y: 50,
            width: 100,
            height: 80,
            radius: 50,
            color: '#000000'
        };
        slides[currentSlideIndex].elements.push(newElement);
        renderSlideElements([newElement]);
    }
}

function addImage() {
    const imageUrl = prompt('Enter image URL:');
    if (imageUrl) {
        const img = new Image();
        img.onload = function() {
            saveState();
            const newElement = {
                type: 'image',
                src: imageUrl,
                x: 50,
                y: 50,
                width: 200,
                height: 200
            };
            slides[currentSlideIndex].elements.push(newElement);
            renderSlideElements([newElement]);
        }
        img.src = imageUrl;
    }
}

async function generateAIContent() {
    const prompt = document.getElementById('ai-prompt-input').value;
    const currentSlide = slides[currentSlideIndex];

    if (prompt) {
        try {
            showLoadingIndicator('Generating AI content...', true);
            const context = getSlideContext(currentSlide);
            const response = await window.electronAPI.generateContent(prompt, context);
            hideLoadingIndicator();

            const newElements = parseAIResponse(response);
            currentSlide.elements.push(...newElements);

            clearSlide();
            renderSlideElements(currentSlide.elements);
            saveState();
            updateSlideNavigation();

            showNotification('AI content generated successfully!', 'success');
            speakText('AI content has been added to the slide.');

            updateCopilotSuggestions(response);
        } catch (error) {
            console.error('Error generating AI content:', error);
            hideLoadingIndicator();
            showNotification('Failed to generate AI content. Please try again.', 'error');
            speakText('An error occurred while generating AI content.');
        }
    } else {
        showNotification('Please enter a prompt for AI content generation.', 'warning');
        speakText('Please enter a prompt for AI content generation.');
    }
    updateARIAAttributes();
}

function getSlideContext(slide) {
    return slide.elements.map(el => el.content || '').join(' ');
}

function parseAIResponse(response) {
    // Parse the AI response and create appropriate slide elements
    const elements = [];
    const lines = response.split('\n');

    lines.forEach((line, index) => {
        if (line.trim()) {
            elements.push({
                type: 'text',
                content: line,
                x: 50,
                y: 50 + (index * 30),
                font: index === 0 ? 'bold 28px Arial' : '24px Arial',
                color: '#333333'
            });
        }
    });

    return elements;
}

function updateCopilotSuggestions(aiResponse) {
    const suggestionsElement = document.getElementById('suggestions-content');
    const suggestions = generateSuggestions(aiResponse);
    suggestionsElement.innerHTML = suggestions.map(s => `<p>${s}</p>`).join('');
}

function generateSuggestions(aiResponse) {
    // Generate Copilot suggestions based on the AI response
    // This is a placeholder implementation
    return [
        "Consider adding an image to illustrate this point.",
        "You might want to break this content into bullet points for clarity.",
        "Think about adding a chart to represent this data visually."
    ];
}

function applyTemplate() {
    const templateName = document.getElementById('template-select').value;
    if (slideTemplates[templateName]) {
        saveState();
        const template = slideTemplates[templateName];
        clearSlide();
        ctx.fillStyle = template.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        slides[currentSlideIndex].elements = [...template.elements];
        renderSlideElements(slides[currentSlideIndex].elements);
        updateSlideNavigation();
    } else {
        alert('Template not found');
    }
}

function startPresentation() {
    document.body.requestFullscreen().then(() => {
        document.getElementById('presentationMode').style.display = 'flex';
        document.getElementById('editMode').style.display = 'none';
        document.getElementById('toolbar').style.display = 'none';
        document.getElementById('slide-controls').style.display = 'flex';
        goToSlide(0);
        updatePresentationControls();
    }).catch(err => {
        console.error('Error attempting to enable full-screen mode:', err.message);
    });
}

function endPresentation() {
    if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
            exitPresentationMode();
        }).catch(err => {
            console.error('Error attempting to exit full-screen mode:', err.message);
            exitPresentationMode();
        });
    } else {
        exitPresentationMode();
    }
}

function exitPresentationMode() {
    document.getElementById('presentationMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'flex';
    document.getElementById('toolbar').style.display = 'flex';
    document.getElementById('slide-controls').style.display = 'none';
    updateEditModeView();
}

function updatePresentationControls() {
    const prevButton = document.getElementById('prevSlideBtn');
    const nextButton = document.getElementById('nextSlideBtn');
    prevButton.style.display = currentSlideIndex > 0 ? 'block' : 'none';
    nextButton.style.display = currentSlideIndex < slides.length - 1 ? 'block' : 'none';
}

function updateFormatting() {
    const font = document.getElementById('fontSelector').value;
    const fontSize = document.getElementById('fontSizeSelector').value;
    const color = document.getElementById('textColorPicker').value;

    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.type === 'text') {
        selectedElement.font = `${fontSize}px ${font}`;
        selectedElement.color = color;
        renderSlideElements([selectedElement]);
    }
}

// Event listeners
document.getElementById('new-slide').addEventListener('click', () => createNewSlide());
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('export-ppt').addEventListener('click', startPresentation);
document.getElementById('template-select').addEventListener('change', applyTemplate);
document.getElementById('nextSlideBtn').addEventListener('click', () => goToSlide(currentSlideIndex + 1));
document.getElementById('prevSlideBtn').addEventListener('click', () => goToSlide(currentSlideIndex - 1));
document.getElementById('deleteSlideBtn').addEventListener('click', deleteCurrentSlide);

document.getElementById('fontSelector').addEventListener('change', updateFormatting);
document.getElementById('fontSizeSelector').addEventListener('change', updateFormatting);
document.getElementById('textColorPicker').addEventListener('change', updateFormatting);
document.getElementById('boldBtn').addEventListener('click', toggleBold);
document.getElementById('italicBtn').addEventListener('click', toggleItalic);

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
createNewSlide('title');
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
    userId = generateUserId();

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
    sessionId = urlParams.get('session') || generateSessionId();
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

// Helper functions
function showLoadingIndicator() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>Generating content...</p>
    `;
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 9999;
    `;
    document.body.appendChild(loadingIndicator);
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function getSelectedElement() {
    // This is a placeholder. In a real implementation, you'd track the currently selected element.
    return slides[currentSlideIndex].elements[0];
}

function toggleBold() {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.type === 'text') {
        if (selectedElement.font.includes('bold')) {
            selectedElement.font = selectedElement.font.replace('bold ', '');
        } else {
            selectedElement.font = 'bold ' + selectedElement.font;
        }
        renderSlideElements([selectedElement]);
    }
}

function toggleItalic() {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.type === 'text') {
        if (selectedElement.font.includes('italic')) {
            selectedElement.font = selectedElement.font.replace('italic ', '');
        } else {
            selectedElement.font = 'italic ' + selectedElement.font;
        }
        renderSlideElements([selectedElement]);
    }
}

function deleteCurrentSlide() {
    if (slides.length > 1) {
        slides.splice(currentSlideIndex, 1);
        currentSlideIndex = Math.max(0, currentSlideIndex - 1);
        loadSlide(currentSlideIndex);
        updateSlideNavigation();
    } else {
        alert('Cannot delete the last slide.');
    }
}

function savePresentation() {
    const presentationData = JSON.stringify(slides);
    // This is a placeholder. In a real implementation, you'd save this data to a file or server.
    console.log('Saving presentation:', presentationData);
    alert('Presentation saved!');
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
}

function getSlideContent(index) {
    return slides[index].elements.map(element => element.content).join(' ');
}

function updateSlideContent(slideIndex, content) {
    if (slides[slideIndex]) {
        slides[slideIndex].content = content;
        if (slideIndex === currentSlideIndex) {
            loadCanvasState(content);
        }
        updateSlideNavigation();
    }
}

function updateCursorPosition(userId, x, y) {
    let cursor = document.getElementById(`cursor-${userId}`);
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = `cursor-${userId}`;
        cursor.className = 'remote-cursor';
        document.body.appendChild(cursor);
    }
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
}

// Call this function when the application starts
initializeCollaboration();

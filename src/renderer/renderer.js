const axe = require('axe-core');

// DOM Elements
const newSlideBtn = document.getElementById('newSlide');
const templatesBtn = document.getElementById('templates');
const autoPromptBtn = document.getElementById('autoPrompt');
const voiceCommandBtn = document.getElementById('voiceCommand');
const brandSyncBtn = document.getElementById('brandSync');
const exportBtn = document.getElementById('exportToPowerPoint');
const slideCanvas = document.getElementById('slideCanvas');
const suggestions = document.getElementById('suggestions');
const analyticsDisplay = document.getElementById('analyticsDisplay');
const templateDropdown = document.getElementById('templateDropdown');

window.addEventListener('load', function() {
  axe.run()
    .then(results => {
      console.log('Accessibility Audit Results:', results);
      if (results.violations.length > 0) {
        console.warn('Accessibility issues found:', results.violations);
      } else {
        console.log('No accessibility issues detected.');
      }
    })
    .catch(err => {
      console.error('Error running accessibility audit:', err);
    });
});

// State
let currentSlideIndex = 0;
let slides = [];
let isListening = false;
let analytics = {
    timeSpent: 0,
    slidesCreated: 0,
    templatesUsed: {}
};

// Templates
const slideTemplates = [
    { name: 'Title Slide', content: '<h1 contenteditable="true">Title</h1><h3 contenteditable="true">Subtitle</h3>' },
    { name: 'Content Slide', content: '<h2 contenteditable="true">Heading</h2><ul><li contenteditable="true">Point 1</li><li contenteditable="true">Point 2</li><li contenteditable="true">Point 3</li></ul>' },
    { name: 'Image Slide', content: '<h2 contenteditable="true">Image Title</h2><div class="image-placeholder">Click to add image</div>' }
];

// Event Listeners
newSlideBtn.addEventListener('click', createNewSlide);
templatesBtn.addEventListener('click', showTemplates);
autoPromptBtn.addEventListener('click', triggerAutoPrompt);
voiceCommandBtn.addEventListener('click', toggleSpeechRecognition);
brandSyncBtn.addEventListener('click', syncBrand);
exportBtn.addEventListener('click', exportToPowerPoint);
document.getElementById('generateAIContent').addEventListener('click', handleAIContentGeneration);
templateDropdown.addEventListener('change', handleTemplateChange);

// Functions
function createNewSlide(template = slideTemplates[1]) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML = template.content;
    slides.push(slide);
    currentSlideIndex = slides.length - 1;
    updateSlideCanvas();
    updateAnalytics('slidesCreated');
}

function updateSlideCanvas() {
    slideCanvas.innerHTML = '';
    slideCanvas.appendChild(slides[currentSlideIndex]);
    setupSlideEventListeners();
}

function setupSlideEventListeners() {
    const elements = slideCanvas.querySelectorAll('[contenteditable="true"]');
    elements.forEach(element => {
        element.addEventListener('input', () => {
            getCopilotSuggestions(element.textContent);
        });
    });
}

function showTemplates() {
    const templateModal = document.createElement('div');
    templateModal.className = 'template-modal';
    templateModal.innerHTML = `
        <h2>Choose a Template</h2>
        ${slideTemplates.map((template, index) => `
            <button class="template-btn" data-index="${index}">${template.name}</button>
        `).join('')}
    `;
    document.body.appendChild(templateModal);

    templateModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-btn')) {
            const templateIndex = parseInt(e.target.dataset.index);
            createNewSlide(slideTemplates[templateIndex]);
            document.body.removeChild(templateModal);
            updateAnalytics('templatesUsed', slideTemplates[templateIndex].name);
        }
    });
}

function triggerAutoPrompt() {
    const currentSlide = slides[currentSlideIndex];
    const slideContent = currentSlide.textContent;
    window.electronAPI.generateAIContent(slideContent)
        .then(aiContent => {
            const aiSuggestion = document.createElement('div');
            aiSuggestion.innerHTML = aiContent;
            currentSlide.appendChild(aiSuggestion);
            updateSlideCanvas();
        })
        .catch(error => console.error('Error generating AI content:', error));
}

function toggleSpeechRecognition() {
    if (isListening) {
        stopSpeechRecognition();
    } else {
        startSpeechRecognition();
    }
}

function startSpeechRecognition() {
    isListening = true;
    voiceCommandBtn.textContent = 'Stop Listening';
    window.electronAPI.startSpeechToText(handleSpeechResult);
}

function stopSpeechRecognition() {
    isListening = false;
    voiceCommandBtn.textContent = 'Start Voice Command';
    window.electronAPI.stopSpeechToText();
}

function handleSpeechResult(result) {
    console.log('Speech recognized:', result);
    processVoiceCommand(result.toLowerCase());
}

function processVoiceCommand(command) {
    if (command.includes('new slide')) {
        createNewSlide();
    } else if (command.includes('next slide')) {
        if (currentSlideIndex < slides.length - 1) {
            currentSlideIndex++;
            updateSlideCanvas();
        }
    } else if (command.includes('previous slide')) {
        if (currentSlideIndex > 0) {
            currentSlideIndex--;
            updateSlideCanvas();
        }
    } else {
        window.electronAPI.processVoiceCommand(command)
            .then(response => {
                console.log('Voice command processed:', response);
                // Handle the response as needed
            })
            .catch(error => console.error('Error processing voice command:', error));
    }
}

function getCopilotSuggestions(content) {
    window.electronAPI.getCopilotSuggestions(content)
        .then(newSuggestions => {
            updateSuggestions(newSuggestions);
        })
        .catch(error => console.error('Error getting Copilot suggestions:', error));
}

function updateSuggestions(newSuggestions) {
    suggestions.innerHTML = newSuggestions.map(suggestion => `<p class="suggestion">${suggestion}</p>`).join('');
    setupSuggestionEventListeners();
}

function setupSuggestionEventListeners() {
    const suggestionElements = suggestions.querySelectorAll('.suggestion');
    suggestionElements.forEach(element => {
        element.addEventListener('click', () => {
            const currentSlide = slides[currentSlideIndex];
            const activeElement = currentSlide.querySelector(':focus');
            if (activeElement) {
                activeElement.textContent = element.textContent;
            }
        });
    });
}

function syncBrand() {
    // Implement brand syncing logic here
    console.log('Brand sync initiated');
    // This could involve fetching brand assets, colors, and fonts from a server
    // and applying them to the current presentation
}

function exportToPowerPoint() {
    // Implement PowerPoint export logic here
    console.log('Exporting to PowerPoint');
    window.electronAPI.exportToPowerPoint(slides)
        .then(() => console.log('Export successful'))
        .catch(error => console.error('Export failed:', error));
}

function updateAnalytics(metric, value) {
    switch(metric) {
        case 'timeSpent':
            analytics.timeSpent += value;
            break;
        case 'slidesCreated':
            analytics.slidesCreated++;
            break;
        case 'templatesUsed':
            analytics.templatesUsed[value] = (analytics.templatesUsed[value] || 0) + 1;
            break;
    }
    displayAnalytics();
}

function displayAnalytics() {
    analyticsDisplay.innerHTML = `
        <p>Time Spent: ${analytics.timeSpent} seconds</p>
        <p>Slides Created: ${analytics.slidesCreated}</p>
        <p>Templates Used: ${JSON.stringify(analytics.templatesUsed)}</p>
    `;
}

function handleTemplateChange(event) {
    const selectedTemplate = slideTemplates[event.target.value];
    createNewSlide(selectedTemplate);
}

// Initialize the first slide and start analytics
createNewSlide();
setInterval(() => updateAnalytics('timeSpent', 1), 1000);

// Set up the preload API
window.electronAPI.onUpdateSuggestions((event, newSuggestions) => {
    updateSuggestions(newSuggestions);
});

// Add event listener for AI content generation
document.getElementById('generateAIContent').addEventListener('click', () => {
    const prompt = document.getElementById('aiPrompt').value;
    window.electronAPI.generatePresentationContent(prompt, (content) => {
        const currentSlide = slides[currentSlideIndex];
        if (currentSlide) {
            const contentElement = currentSlide.querySelector('[contenteditable="true"]');
            if (contentElement) {
                contentElement.textContent = content;
            } else {
                const newContent = document.createElement('div');
                newContent.contentEditable = true;
                newContent.textContent = content;
                currentSlide.appendChild(newContent);
            }
        } else {
            createNewSlide({ name: 'AI Generated', content: `<div contenteditable="true">${content}</div>` });
        }
        updateSlideCanvas();
    });
});

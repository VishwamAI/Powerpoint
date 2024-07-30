const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let presentationFilePath = null;
let presentationData = null;
let collaborators = [];

function loadPresentation(filePath) {
    presentationFilePath = filePath;
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Error reading presentation file:', err);
            return;
        }
        presentationData = JSON.parse(data);
        updatePresentationUI();
    });
}

function savePresentation() {
    if (!presentationFilePath || !presentationData) {
        console.error('No presentation file loaded.');
        return;
    }
    fs.writeFile(presentationFilePath, JSON.stringify(presentationData, null, 2), (err) => {
        if (err) {
            console.error('Error saving presentation file:', err);
        }
    });
}

function updatePresentationUI() {
    // Update the UI with the loaded presentation data
    // This function should be implemented to reflect the changes in the presentationData
}

function addCollaborator(collaborator) {
    collaborators.push(collaborator);
    ipcRenderer.send('add-collaborator', collaborator);
}

function removeCollaborator(collaborator) {
    collaborators = collaborators.filter(c => c !== collaborator);
    ipcRenderer.send('remove-collaborator', collaborator);
}

function handleCollaboratorChanges(changes) {
    // Apply changes from collaborators to the presentationData
    // This function should be implemented to handle real-time updates from collaborators
}

ipcRenderer.on('collaborator-changes', (event, changes) => {
    handleCollaboratorChanges(changes);
    updatePresentationUI();
});

module.exports = {
    loadPresentation,
    savePresentation,
    addCollaborator,
    removeCollaborator
};

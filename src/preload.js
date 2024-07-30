const { contextBridge, ipcRenderer } = require('electron');
const { SpeechToText } = require('electron-speech');
const { exec } = require('child_process');

contextBridge.exposeInMainWorld('electronAPI', {
  createPresentation: () => ipcRenderer.invoke('create-presentation'),
  savePresentation: (data) => ipcRenderer.invoke('save-presentation', data),
  loadPresentation: () => ipcRenderer.invoke('load-presentation'),
  generateAIContent: (prompt) => ipcRenderer.invoke('generate-ai-content', prompt),
  processVoiceCommand: (command) => ipcRenderer.invoke('process-voice-command', command),
  getCopilotSuggestions: (content) => ipcRenderer.invoke('get-copilot-suggestions', content),
  onUpdateSuggestions: (callback) => ipcRenderer.on('update-suggestions', callback),
  startSpeechToText: (callback) => {
    const speech = new SpeechToText();
    speech.start();
    speech.on('data', (data) => {
      callback(data);
    });
  },
  stopSpeechToText: () => {
    const speech = new SpeechToText();
    speech.stop();
  },
  generatePresentationContent: (prompt, callback) => {
    exec(`python3 src/ai_content_generator.py "${prompt}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      const result = JSON.parse(stdout);
      callback(result.content);
    });
  }
});

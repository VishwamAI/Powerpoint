const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Encryption and Decryption functions
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text) {
  let iv = Buffer.from(text.iv, 'hex');
  let encryptedText = Buffer.from(text.encryptedData, 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// IPC handlers for saving and loading presentations with encryption
ipcMain.handle('save-presentation', async (event, data) => {
  const encryptedData = encrypt(JSON.stringify(data));
  const filePath = path.join(app.getPath('documents'), 'presentation.enc');
  fs.writeFileSync(filePath, JSON.stringify(encryptedData));
  return filePath;
});

ipcMain.handle('load-presentation', async (event) => {
  const filePath = path.join(app.getPath('documents'), 'presentation.enc');
  if (fs.existsSync(filePath)) {
    const encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const decryptedData = decrypt(encryptedData);
    return JSON.parse(decryptedData);
  } else {
    throw new Error('Presentation file not found');
  }
});

// Auto-prompt and Copilot-like features
ipcMain.handle('generate-suggestion', async (event, slideContent) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [path.join(__dirname, 'ai_content_generator.py'), slideContent]);
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
      reject(data.toString());
    });
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(`Process exited with code ${code}`);
      } else {
        resolve(JSON.parse(result));
      }
    });
  });
});

// User-related templates
const templates = {
  default: { name: 'Default', content: 'Basic presentation template' },
  business: { name: 'Business', content: 'Professional business presentation template' },
  education: { name: 'Education', content: 'Educational lecture template' },
  creative: { name: 'Creative', content: 'Creative and visually appealing template' },
};

ipcMain.handle('get-templates', () => {
  return templates;
});

ipcMain.handle('load-template', (event, templateName) => {
  return templates[templateName] || templates.default;
});

// Verbal communication features
let recognition = null;

ipcMain.handle('start-speech-recognition', () => {
  if (!recognition) {
    // This is a placeholder. In a real implementation, you'd use a native speech recognition module.
    recognition = {
      start: () => console.log('Speech recognition started'),
      stop: () => console.log('Speech recognition stopped'),
      onresult: null
    };
  }
  recognition.start();
});

ipcMain.handle('stop-speech-recognition', () => {
  if (recognition) {
    recognition.stop();
  }
});

// Analytics features
function logAnalyticsEvent(eventName, eventData) {
  // This is a placeholder function for future implementation
  console.log('Analytics Event:', eventName, eventData);
  // TODO: Implement actual analytics logging logic
}

// Usage example (to be called from appropriate places in the application)
// logAnalyticsEvent('new_slide_created', { templateUsed: 'title_slide', timeSpent: 120 });

// TODO: Implement the rest of the analytics features as outlined in the comments

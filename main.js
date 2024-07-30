const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });

    mainWindow.loadFile('index.html');

    // Log the loading of the main window
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Main window loaded successfully.');
    });

    // Log any errors that occur during the rendering process
    mainWindow.webContents.on('crashed', () => {
        console.error('Main window has crashed.');
    });

    mainWindow.webContents.on('unresponsive', () => {
        console.error('Main window is unresponsive.');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Failed to load main window: ${errorDescription} (Error code: ${errorCode})`);
    });
}

app.on('ready', () => {
    app.commandLine.appendSwitch('disable-gpu');
    console.log('Application is ready.');
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

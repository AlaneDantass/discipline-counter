const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Set app name for WM_CLASS on Linux
app.name = 'studyos';
app.setName('studyos');

// Importa o DatabaseHelper (SQLite)
const dbHelper = require('./db');

// ============================================================
//  CONFIGURAÇÃO
// ============================================================
const WIDGET_WIDTH  = 420;
const WIDGET_HEIGHT = 700;
const MARGIN_RIGHT  = 40;
const MARGIN_TOP    = 50;

const APP_WIDTH  = 1100;
const APP_HEIGHT = 720;

// Diretório de dados persistentes
const DATA_DIR = app.getPath('userData');
const POS_FILE  = path.join(DATA_DIR, 'window-position.json');
const DATA_FILE = path.join(DATA_DIR, 'disciplines.json');

// ============================================================
//  PERSISTÊNCIA (JSON File)
//  Phase 5: será substituído por SQLite
// ============================================================

function loadJSON(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch { /* ignore */ }
  return fallback;
}

function saveJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch { /* ignore */ }
}

// Migração: se existiam dados no localStorage (via Electron's partition),
// não conseguimos acessar aqui, então o renderer faz a migração na primeira vez
// via IPC "save-disciplines".

// ============================================================
//  JANELAS
// ============================================================

let widgetWin = null;
let appWin = null;

function createWidgetWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW } = primaryDisplay.workAreaSize;

  const saved = loadJSON(POS_FILE, null);
  const x = saved ? saved.x : screenW - WIDGET_WIDTH - MARGIN_RIGHT;
  const y = saved ? saved.y : MARGIN_TOP;

  widgetWin = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x,
    y,
    title: 'StudyOS Widget',
    icon: path.join(__dirname, 'icon.png'),
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  widgetWin.loadFile(path.join(__dirname, 'widget', 'widget.html'));

  // Salva posição ao arrastar
  widgetWin.on('moved', () => {
    const [nx, ny] = widgetWin.getPosition();
    saveJSON(POS_FILE, { x: nx, y: ny });
  });

  widgetWin.on('closed', () => {
    widgetWin = null;
  });
}

function createAppWindow() {
  if (appWin) {
    appWin.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  appWin = new BrowserWindow({
    width: APP_WIDTH,
    height: APP_HEIGHT,
    x: Math.round((screenW - APP_WIDTH) / 2),
    y: Math.round((screenH - APP_HEIGHT) / 2),
    title: 'StudyOS',
    icon: path.join(__dirname, 'icon.png'),
    frame: true,
    transparent: false,
    resizable: true,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0a0a10',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  appWin.loadFile(path.join(__dirname, 'app', 'app.html'));

  appWin.on('closed', () => {
    appWin = null;
  });
}

// ============================================================
//  IPC HANDLERS
// ============================================================

// --- Navegação entre janelas ---
ipcMain.on('open-app', () => createAppWindow());

ipcMain.on('close-app', () => {
  if (appWin) appWin.close();
});

// --- Modal focus (widget) ---
ipcMain.on('modal-opened', () => {
  if (widgetWin) {
    widgetWin.setAlwaysOnTop(true);
    widgetWin.focus();
  }
});

ipcMain.on('modal-closed', () => {
  if (widgetWin) {
    widgetWin.setAlwaysOnTop(false);
    widgetWin.blur();
  }
});

// --- Data: Disciplines ---
ipcMain.handle('get-disciplines', async () => {
  try {
    return await dbHelper.getDisciplines();
  } catch (err) {
    console.error('Erro ao buscar disciplinas do SQLite:', err);
    return [];
  }
});

ipcMain.handle('save-disciplines', async (_event, data) => {
  try {
    await dbHelper.saveDisciplines(data);
    // Notifica a outra janela para atualizar (se existir)
    if (widgetWin && !widgetWin.isDestroyed()) {
      widgetWin.webContents.send('data-changed');
    }
    if (appWin && !appWin.isDestroyed()) {
      appWin.webContents.send('data-changed');
    }
    return true;
  } catch (err) {
    console.error('Erro ao salvar disciplinas no SQLite:', err);
    return false;
  }
});

// --- Data: Events (placeholder para Phase 2+) ---
ipcMain.handle('get-events', () => {
  const eventsFile = path.join(DATA_DIR, 'events.json');
  return loadJSON(eventsFile, []);
});

ipcMain.handle('save-events', (_event, data) => {
  const eventsFile = path.join(DATA_DIR, 'events.json');
  saveJSON(eventsFile, data);
  return true;
});

// --- Data: Schedules (Phase 3) ---
ipcMain.handle('get-schedules', () => {
  const schedulesFile = path.join(DATA_DIR, 'schedules.json');
  return loadJSON(schedulesFile, []);
});

ipcMain.handle('save-schedules', (_event, data) => {
  const schedulesFile = path.join(DATA_DIR, 'schedules.json');
  saveJSON(schedulesFile, data);
  if (widgetWin && !widgetWin.isDestroyed()) {
    widgetWin.webContents.send('data-changed');
  }
  if (appWin && !appWin.isDestroyed()) {
    appWin.webContents.send('data-changed');
  }
  return true;
});

// ============================================================
//  APP LIFECYCLE
// ============================================================

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (widgetWin) {
      widgetWin.show();
      widgetWin.focus();
    }
  });

  app.whenReady().then(createWidgetWindow);
}

app.on('window-all-closed', () => {
  app.quit();
});

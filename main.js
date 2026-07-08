const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ============================================================
//  CONFIGURAÇÃO
// ============================================================
const WIDGET_WIDTH  = 420;
const WIDGET_HEIGHT = 700;
const MARGIN_RIGHT  = 40;
const MARGIN_TOP    = 50;

// Arquivo para salvar posição da janela
const POS_FILE = path.join(app.getPath('userData'), 'window-position.json');
// ============================================================

function loadPosition() {
  try {
    if (fs.existsSync(POS_FILE)) {
      return JSON.parse(fs.readFileSync(POS_FILE, 'utf8'));
    }
  } catch { /* ignore */ }
  return null;
}

function savePosition(x, y) {
  try {
    fs.writeFileSync(POS_FILE, JSON.stringify({ x, y }));
  } catch { /* ignore */ }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW } = primaryDisplay.workAreaSize;

  // Posição salva ou padrão (canto superior direito)
  const saved = loadPosition();
  const x = saved ? saved.x : screenW - WIDGET_WIDTH - MARGIN_RIGHT;
  const y = saved ? saved.y : MARGIN_TOP;

  const win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x,
    y,
    title: 'DisciplineCounter',
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

  win.loadFile(path.join(__dirname, 'index.html'));

  // Salva posição ao mover (arrastar)
  win.on('moved', () => {
    const [nx, ny] = win.getPosition();
    savePosition(nx, ny);
  });

  // --- Controle de foco via IPC para o modal de edição ---
  let modalOpen = false;

  ipcMain.on('modal-opened', () => {
    modalOpen = true;
    win.setAlwaysOnTop(true);
    win.focus();
  });

  ipcMain.on('modal-closed', () => {
    modalOpen = false;
    win.setAlwaysOnTop(false);
    win.blur();
  });
}

// Impede múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Se tentarem abrir outra instância, ignora
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  app.quit();
});

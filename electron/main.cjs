const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { scanChrome } = require('./scanner.cjs');

function setsFilePath() {
  return path.join(app.getPath('userData'), 'shared-sets.json');
}

function readSharedSets() {
  try {
    const value = JSON.parse(fs.readFileSync(setsFilePath(), 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeSharedSets(sets) {
  const target = setsFilePath();
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(sets, null, 2), 'utf8');
  fs.renameSync(temporary, target);
}

function saveSharedSet(input) {
  const name = String(input?.name || '').trim().slice(0, 60);
  if (!name) throw new Error('세트 이름을 입력하세요.');
  const extensionIds = [...new Set((input?.extensionIds || []).filter((id) => /^[a-p]{32}$/.test(id)))];
  const sets = readSharedSets();
  const now = new Date().toISOString();
  const existingIndex = sets.findIndex((item) => item.id === input.id);
  const value = { id: existingIndex >= 0 ? sets[existingIndex].id : `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, extensionIds, createdAt: existingIndex >= 0 ? sets[existingIndex].createdAt : now, updatedAt: now };
  if (existingIndex >= 0) sets[existingIndex] = value; else sets.push(value);
  writeSharedSets(sets);
  return value;
}

function deleteSharedSet(id) {
  const sets = readSharedSets();
  const next = sets.filter((item) => item.id !== id);
  if (next.length === sets.length) return false;
  writeSharedSets(next);
  return true;
}

function chromeExecutable() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function openStoreForProfile(directory, extensionId) {
  if (!/^(Default|Profile \d+)$/.test(directory)) throw new Error('잘못된 프로필 디렉터리입니다.');
  if (!/^[a-p]{32}$/.test(extensionId)) throw new Error('잘못된 확장 프로그램 ID입니다.');
  const url = `https://chromewebstore.google.com/detail/${extensionId}`;
  const executable = chromeExecutable();
  if (!executable) return shell.openExternal(url);
  const child = spawn(executable, [`--profile-directory=${directory}`, url], { detached: true, stdio: 'ignore' });
  child.unref();
  return true;
}

function openExtensionManagerForProfile(directory, extensionId) {
  // Chrome can ignore chrome:// URLs passed by another process and open a
  // blank window instead. The Web Store page reliably targets the requested
  // profile and exposes "Remove from Chrome" when already installed.
  return openStoreForProfile(directory, extensionId);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f4f3ee',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.CHEXHUB_DEV_SERVER === '1') win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('chrome:scan', () => scanChrome());
  ipcMain.handle('chrome:open-store', (_event, payload) => openStoreForProfile(payload.directory, payload.extensionId));
  ipcMain.handle('chrome:open-extension-manager', (_event, payload) => openExtensionManagerForProfile(payload.directory, payload.extensionId));
  ipcMain.handle('sets:list', () => readSharedSets());
  ipcMain.handle('sets:save', (_event, payload) => saveSharedSet(payload));
  ipcMain.handle('sets:delete', (_event, id) => deleteSharedSet(id));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

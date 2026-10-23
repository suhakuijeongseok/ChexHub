const { app, BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { scanChrome } = require('./scanner.cjs');

const appIconPath = path.join(__dirname, '..', 'public', 'chexhub-logo.png');

app.setName('ChexHub');
if (process.platform === 'win32') app.setAppUserModelId('com.chexhub.desktop');

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
    icon: appIconPath,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.CHEXHUB_DEV_SERVER === '1') win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  let storeView = null;
  let storeVisible = false;
  const safeBounds = (bounds) => ({
    x: Math.max(0, Math.round(Number(bounds?.x) || 0)),
    y: Math.max(0, Math.round(Number(bounds?.y) || 0)),
    width: Math.max(100, Math.round(Number(bounds?.width) || 100)),
    height: Math.max(100, Math.round(Number(bounds?.height) || 100)),
  });
  const ensureStoreView = () => {
    if (storeView) return storeView;
    storeView = new WebContentsView({ webPreferences: { partition: 'persist:chexhub-store', sandbox: true, contextIsolation: true, nodeIntegration: false } });
    storeView.webContents.setZoomFactor(0.65);
    storeView.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    storeView.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://chromewebstore.google.com/')) storeView.webContents.loadURL(url);
      return { action: 'deny' };
    });
    const reportNavigation = (_event, url) => win.webContents.send('store:navigated', { url });
    storeView.webContents.on('did-finish-load', async () => {
      storeView.webContents.setZoomFactor(0.65);
      const url = storeView.webContents.getURL();
      try {
        const metadata = await storeView.webContents.executeJavaScript(`(async () => {
          const value = (selector, attribute = 'content') => document.querySelector(selector)?.getAttribute(attribute) || '';
          document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
          document.body.style.setProperty('overflow-x', 'hidden', 'important');
          const inspect = () => {
            const headings = [...document.querySelectorAll('h1, h2')].filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && element.textContent?.trim();
            });
            const heading = headings.sort((first, second) => parseFloat(getComputedStyle(second).fontSize) - parseFloat(getComputedStyle(first).fontSize))[0];
            if (!heading) return null;
            const headingRect = heading.getBoundingClientRect();
            const images = [...document.images].filter((image) => {
              const rect = image.getBoundingClientRect();
              return rect.width >= 28 && rect.width <= 180 && Math.abs(rect.width - rect.height) < 16 && Math.abs(rect.top - headingRect.top) < 140;
            });
            const icon = images.sort((first, second) => {
              const firstRect = first.getBoundingClientRect();
              const secondRect = second.getBoundingClientRect();
              const firstDistance = Math.abs(firstRect.top - headingRect.top) + Math.abs(firstRect.right - headingRect.left);
              const secondDistance = Math.abs(secondRect.top - headingRect.top) + Math.abs(secondRect.right - headingRect.left);
              return firstDistance - secondDistance;
            })[0];
            return icon ? { name: heading.textContent.trim(), iconUrl: icon.currentSrc || icon.src } : null;
          };
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const result = inspect();
            if (result?.iconUrl) return result;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          return {
            name: value('meta[property="og:title"]') || document.title.replace(/ - Chrome Web Store$/, ''),
            iconUrl: value('meta[property="og:image"]')
          };
        })()`);
        win.webContents.send('store:navigated', { url, ...metadata });
      } catch {
        win.webContents.send('store:navigated', { url });
      }
    });
    storeView.webContents.on('did-navigate', reportNavigation);
    storeView.webContents.on('did-navigate-in-page', reportNavigation);
    return storeView;
  };
  const showStore = (event, payload) => {
    if (event.sender !== win.webContents) return;
    const view = ensureStoreView();
    if (!storeVisible) { win.contentView.addChildView(view); storeVisible = true; }
    view.setBounds(safeBounds(payload.bounds));
    const query = String(payload.query || '').trim();
    const url = query ? `https://chromewebstore.google.com/search/${encodeURIComponent(query)}` : 'https://chromewebstore.google.com/category/extensions';
    view.webContents.loadURL(url);
  };
  const resizeStore = (event, bounds) => { if (event.sender === win.webContents && storeView) storeView.setBounds(safeBounds(bounds)); };
  const hideStore = (event) => { if (event.sender === win.webContents && storeView && storeVisible) { win.contentView.removeChildView(storeView); storeVisible = false; } };
  ipcMain.on('store:show', showStore);
  ipcMain.on('store:bounds', resizeStore);
  ipcMain.on('store:hide', hideStore);
  win.on('closed', () => {
    ipcMain.removeListener('store:show', showStore);
    ipcMain.removeListener('store:bounds', resizeStore);
    ipcMain.removeListener('store:hide', hideStore);
    if (storeView) storeView.webContents.close();
  });
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

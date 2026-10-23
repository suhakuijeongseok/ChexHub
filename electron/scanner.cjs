const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CHROME_UPDATE_URL = 'https://clients2.google.com/service/update2/crx';

function chromeUserDataPath(platform = process.platform, env = process.env) {
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  if (platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'google-chrome');
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function localizeName(manifest, versionDir) {
  const raw = manifest.name || 'Unknown extension';
  const match = /^__MSG_(.+)__$/.exec(raw);
  if (!match) return raw;
  const locales = [manifest.default_locale, 'ko', 'en'].filter(Boolean);
  for (const locale of locales) {
    const messages = readJson(path.join(versionDir, '_locales', locale, 'messages.json'));
    const entry = messages?.[match[1]] || messages?.[match[1].toLowerCase()];
    if (entry?.message) return entry.message;
  }
  return match[1];
}

function extensionIconDataUrl(manifest, versionDir) {
  const iconSources = [manifest.icons, manifest.action?.default_icon, manifest.browser_action?.default_icon];
  const candidates = iconSources.flatMap((source) => {
    if (typeof source === 'string') return [{ size: 0, relativePath: source }];
    return Object.entries(source || {}).map(([size, relativePath]) => ({ size: Number(size) || 0, relativePath }));
  })
    .filter(({ relativePath }) => typeof relativePath === 'string')
    .sort((a, b) => b.size - a.size);
  const mimeTypes = new Map([
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.webp', 'image/webp'],
    ['.gif', 'image/gif'],
  ]);
  const root = path.resolve(versionDir) + path.sep;
  for (const { relativePath } of candidates) {
    const iconPath = path.resolve(versionDir, relativePath.replace(/^[/\\]+/, ''));
    if (!iconPath.startsWith(root)) continue;
    const mimeType = mimeTypes.get(path.extname(iconPath).toLowerCase());
    if (!mimeType) continue;
    try {
      const bytes = fs.readFileSync(iconPath);
      return `data:${mimeType};base64,${bytes.toString('base64')}`;
    } catch { /* Try the next declared icon size. */ }
  }
  return '';
}

function newestVersionDir(extensionDir) {
  try {
    return fs.readdirSync(extensionDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ name: entry.name, dir: path.join(extensionDir, entry.name) }))
      .filter(({ dir }) => fs.existsSync(path.join(dir, 'manifest.json')))
      .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0];
  } catch { return null; }
}

function readExtensionState(profileDir) {
  const prefs = readJson(path.join(profileDir, 'Preferences'));
  return prefs?.extensions?.settings || {};
}

function scanExtensions(profileDir) {
  const root = path.join(profileDir, 'Extensions');
  const state = readExtensionState(profileDir);
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[a-p]{32}$/.test(entry.name))
      .map((entry) => {
        const latest = newestVersionDir(path.join(root, entry.name));
        if (!latest) return null;
        const manifest = readJson(path.join(latest.dir, 'manifest.json'));
        if (!manifest) return null;
        const extensionState = state[entry.name] || {};
        return {
          id: entry.name,
          name: localizeName(manifest, latest.dir),
          iconDataUrl: extensionIconDataUrl(manifest, latest.dir),
          version: manifest.version || latest.name,
          enabled: extensionState.state !== 0,
          fromWebStore: !manifest.update_url || manifest.update_url === CHROME_UPDATE_URL,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}

function scanChrome() {
  const userDataDir = chromeUserDataPath();
  const localState = readJson(path.join(userDataDir, 'Local State'));
  if (!localState) return { userDataDir, lastUsed: '', profiles: [], error: 'Chrome 프로필 데이터를 찾지 못했습니다.' };
  const info = localState.profile?.info_cache || {};
  const order = localState.profile?.profiles_order || Object.keys(info);
  const profiles = order.filter((directory) => info[directory]).map((directory) => {
    const meta = info[directory];
    return {
      directory,
      name: meta.name || directory,
      account: meta.user_name || '',
      managed: Boolean(meta.is_managed),
      extensions: scanExtensions(path.join(userDataDir, directory)),
    };
  });
  return { userDataDir, lastUsed: localState.profile?.last_used || '', profiles };
}

module.exports = { chromeUserDataPath, extensionIconDataUrl, localizeName, scanChrome, scanExtensions };

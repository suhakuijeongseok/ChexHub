const state = { extensions: [], query: '', filter: 'all' };
const list = document.querySelector('#list');
const empty = document.querySelector('#empty');
const summary = document.querySelector('#summary');
const toast = document.querySelector('#toast');

function iconFor(extension) {
  return [...(extension.icons || [])].sort((a, b) => b.size - a.size)[0]?.url || '';
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 2400);
}

function render() {
  const query = state.query.toLowerCase();
  const extensions = state.extensions.filter((extension) => {
    if (!`${extension.name} ${extension.id}`.toLowerCase().includes(query)) return false;
    if (state.filter === 'enabled') return extension.enabled;
    if (state.filter === 'settings') return Boolean(extension.optionsUrl);
    return true;
  });
  list.replaceChildren(...extensions.map((extension) => {
    const card = document.createElement('article');
    card.className = 'card';
    const iconUrl = iconFor(extension);
    const icon = document.createElement(iconUrl ? 'img' : 'span');
    icon.className = 'icon';
    if (iconUrl) { icon.src = iconUrl; icon.alt = ''; } else { icon.textContent = extension.name.slice(0, 1).toUpperCase(); }
    const meta = document.createElement('div'); meta.className = 'meta';
    const titleRow = document.createElement('div'); titleRow.className = 'title-row';
    const title = document.createElement('b'); title.textContent = extension.name;
    titleRow.append(title);
    if (extension.enabled) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'ON'; titleRow.append(badge); }
    const version = document.createElement('small'); version.textContent = `v${extension.version}`;
    const actions = document.createElement('div'); actions.className = 'actions';
    const settings = document.createElement('button'); settings.className = 'primary'; settings.textContent = '설정'; settings.disabled = !extension.optionsUrl;
    settings.addEventListener('click', () => extension.optionsUrl && chrome.tabs.create({ url: extension.optionsUrl }));
    const store = document.createElement('button'); store.textContent = 'Web Store'; store.addEventListener('click', () => chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${extension.id}` }));
    const remove = document.createElement('button'); remove.className = 'danger'; remove.textContent = '삭제';
    remove.addEventListener('click', () => chrome.management.uninstall(extension.id, { showConfirmDialog: true }, () => {
      if (chrome.runtime.lastError) showToast(chrome.runtime.lastError.message); else void load();
    }));
    actions.append(settings, store, remove); meta.append(titleRow, version, actions); card.append(icon, meta); return card;
  }));
  empty.hidden = extensions.length > 0;
}

async function load() {
  const self = chrome.runtime.id;
  state.extensions = (await chrome.management.getAll())
    .filter((extension) => extension.type === 'extension' && extension.id !== self)
    .sort((a, b) => a.name.localeCompare(b.name));
  summary.textContent = `${state.extensions.length}개 설치됨 · ${state.extensions.filter((item) => item.enabled).length}개 사용 중`;
  render();
}

document.querySelector('#query').addEventListener('input', (event) => { state.query = event.target.value; render(); });
document.querySelector('#refresh').addEventListener('click', () => void load());
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active'); state.filter = button.dataset.filter; render();
}));
chrome.management.onInstalled.addListener(load);
chrome.management.onUninstalled.addListener(load);
chrome.management.onEnabled.addListener(load);
chrome.management.onDisabled.addListener(load);
void load();

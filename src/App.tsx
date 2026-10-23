import { useEffect, useMemo, useState } from 'react';
import type { ChromeProfile, ExtensionInfo, ScanResult, SharedSet } from './types';

type ExtensionRow = ExtensionInfo & { profiles: Map<string, ExtensionInfo> };

function buildRows(profiles: ChromeProfile[]): ExtensionRow[] {
  const rows = new Map<string, ExtensionRow>();
  for (const profile of profiles) for (const extension of profile.extensions) {
    const row = rows.get(extension.id) || { ...extension, profiles: new Map() };
    row.profiles.set(profile.directory, extension);
    rows.set(extension.id, row);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function Logo({ extension, large = false }: { extension: ExtensionInfo; large?: boolean }) {
  return <span className={large ? 'extension-logo large' : 'extension-logo'}>{extension.iconDataUrl ? <img src={extension.iconDataUrl} alt="" /> : extension.name.slice(0, 1).toUpperCase()}</span>;
}

function ProfileStrip({ profiles, selected, toggle }: { profiles: ChromeProfile[]; selected: Set<string>; toggle: (directory: string) => void }) {
  return <div className="profile-strip">{profiles.map((profile) => <label key={profile.directory} className={selected.has(profile.directory) ? 'selected' : ''}><input type="checkbox" checked={selected.has(profile.directory)} onChange={() => toggle(profile.directory)} /><span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.account || '로컬 프로필'}{profile.managed ? ' · 관리됨' : ''}</small></span></label>)}</div>;
}

function App() {
  const [view, setView] = useState<'extensions' | 'sets'>('extensions');
  const [data, setData] = useState<ScanResult | null>(null);
  const [sets, setSets] = useState<SharedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [selectedExtension, setSelectedExtension] = useState('');
  const [activeSetId, setActiveSetId] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftExtensionIds, setDraftExtensionIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [result, savedSets] = await Promise.all([window.chexhub.scan(), window.chexhub.listSets()]);
      setData(result); setSets(savedSets);
      setSelectedProfiles((current) => current.size ? current : new Set(result.profiles.map((profile) => profile.directory)));
    } catch (error) { setData({ userDataDir: '', lastUsed: '', profiles: [], error: String(error) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);
  const rows = useMemo(() => buildRows(data?.profiles || []), [data]);
  const filteredRows = rows.filter((row) => `${row.name} ${row.id}`.toLowerCase().includes(query.toLowerCase()));
  const selectedRow = rows.find((row) => row.id === selectedExtension);
  const activeSet = sets.find((set) => set.id === activeSetId);
  const totalInstalled = data?.profiles.reduce((sum, profile) => sum + profile.extensions.length, 0) || 0;

  const toggleProfile = (directory: string) => setSelectedProfiles((current) => { const next = new Set(current); next.has(directory) ? next.delete(directory) : next.add(directory); return next; });

  const installMissing = async () => {
    if (!selectedRow) return;
    const targets = (data?.profiles || []).filter((profile) => selectedProfiles.has(profile.directory) && !selectedRow.profiles.has(profile.directory));
    if (!targets.length) return setToast('선택한 프로필에는 이미 모두 설치되어 있어요.');
    for (const profile of targets) await window.chexhub.openStore(profile.directory, selectedRow.id);
    setToast(`${targets.length}개 프로필에서 Web Store를 열었습니다.`);
  };

  const removeInstalled = async () => {
    if (!selectedRow) return;
    const targets = (data?.profiles || []).filter((profile) => selectedProfiles.has(profile.directory) && selectedRow.profiles.has(profile.directory));
    if (!targets.length) return setToast('선택한 프로필에는 이 확장 프로그램이 설치되어 있지 않아요.');
    for (const profile of targets) await window.chexhub.openExtensionManager(profile.directory, selectedRow.id);
    setToast(`${targets.length}개 프로필에서 Web Store를 열었습니다. ‘Chrome에서 삭제’를 눌러 주세요.`);
  };

  const editSet = (set?: SharedSet) => { setActiveSetId(set?.id || ''); setDraftName(set?.name || ''); setDraftExtensionIds(new Set(set?.extensionIds || [])); };
  const saveSet = async () => {
    try {
      const saved = await window.chexhub.saveSet({ id: activeSetId || undefined, name: draftName, extensionIds: [...draftExtensionIds] });
      setSets((current) => [...current.filter((item) => item.id !== saved.id), saved]); setActiveSetId(saved.id); setToast(`‘${saved.name}’ 세트를 저장했습니다.`);
    } catch (error) { setToast(String(error)); }
  };
  const deleteSet = async () => {
    if (!activeSet || !window.confirm(`‘${activeSet.name}’ 공유 세트를 삭제할까요?`)) return;
    await window.chexhub.deleteSet(activeSet.id); setSets((current) => current.filter((item) => item.id !== activeSet.id)); editSet(); setToast('공유 세트를 삭제했습니다.');
  };
  const applySet = async () => {
    if (!activeSet) return;
    let opened = 0;
    for (const profile of data?.profiles || []) if (selectedProfiles.has(profile.directory)) {
      const installed = new Set(profile.extensions.map((extension) => extension.id));
      for (const extensionId of activeSet.extensionIds) if (!installed.has(extensionId)) { await window.chexhub.openStore(profile.directory, extensionId); opened += 1; }
    }
    setToast(opened ? `${opened}개의 누락된 설치 페이지를 열었습니다.` : '선택한 프로필이 이미 이 세트와 일치합니다.');
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><img src="./chexhub-logo.png" alt="" /></span><span>ChexHub</span></div>
      <nav><button className={`nav-item ${view === 'extensions' ? 'active' : ''}`} onClick={() => setView('extensions')}><span>⊞</span> 확장 프로그램</button><button className={`nav-item ${view === 'sets' ? 'active' : ''}`} onClick={() => { setView('sets'); setQuery(''); }}><span>◇</span> 공유 세트 <em>{sets.length}</em></button></nav>
      <div className="sidebar-foot"><p>LOCAL CHROME</p><span>{data?.profiles.length || 0} profiles connected</span><small title={data?.userDataDir}>{data?.userDataDir || '프로필 검색 중'}</small></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">{view === 'extensions' ? 'EXTENSION CONTROL CENTER' : 'SHARED COLLECTIONS'}</p><h1>{view === 'extensions' ? '한 번에 보고, 필요한 곳에 설치하세요.' : '자주 쓰는 확장을 하나의 세트로.'}</h1></div><button className="refresh" onClick={() => void refresh()} disabled={loading}>{loading ? '검색 중…' : '↻ 새로고침'}</button></header>
      {data?.error ? <div className="error">{data.error}</div> : null}
      {view === 'extensions' ? <>
        <section className="stats"><article><span>프로필</span><strong>{data?.profiles.length || 0}</strong><small>이 컴퓨터에서 발견</small></article><article><span>고유 확장</span><strong>{rows.length}</strong><small>프로필 전체 합집합</small></article><article><span>설치 인스턴스</span><strong>{totalInstalled}</strong><small>모든 프로필 합계</small></article><article className="accent"><span>동기화 상태</span><strong>{rows.filter((row) => row.profiles.size === data?.profiles.length).length}/{rows.length}</strong><small>모든 프로필에 설치됨</small></article></section>
        <section className="workspace"><div className="toolbar"><div><h2>설치 매트릭스</h2><p>확장 프로그램을 선택해 여러 프로필에서 관리하세요.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 ID 검색" /></div><ProfileStrip profiles={data?.profiles || []} selected={selectedProfiles} toggle={toggleProfile} />
          <div className="table-wrap"><table><thead><tr><th>확장 프로그램</th>{(data?.profiles || []).map((profile) => <th key={profile.directory}>{profile.name}</th>)}</tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id} className={selectedExtension === row.id ? 'active-row' : ''} onClick={() => setSelectedExtension(row.id)}><td><Logo extension={row} /><span><b>{row.name}</b><small>{row.id} · v{row.version}</small></span></td>{(data?.profiles || []).map((profile) => { const installed = row.profiles.get(profile.directory); return <td key={profile.directory}>{installed ? <button className={installed.enabled ? 'status installed' : 'status disabled'} title={`${profile.name}에서 제거`} onClick={(event) => { event.stopPropagation(); setSelectedExtension(row.id); void window.chexhub.openExtensionManager(profile.directory, row.id); }}>{installed.enabled ? '✓' : '–'}</button> : <button className="install-cell" title={`${profile.name}에서 설치`} onClick={(event) => { event.stopPropagation(); void window.chexhub.openStore(profile.directory, row.id); }}>+</button>}</td>; })}</tr>)}</tbody></table>{!loading && !filteredRows.length ? <div className="empty">검색 결과가 없습니다.</div> : null}</div>
        </section>
      </> : <section className="sets-workspace">
        <div className="sets-list"><div className="sets-list-head"><div><h2>내 공유 세트</h2><p>{sets.length}개의 세트</p></div><button onClick={() => editSet()}>＋ 새 세트</button></div>{sets.map((set) => <button key={set.id} className={activeSetId === set.id ? 'set-card active' : 'set-card'} onClick={() => editSet(set)}><span>◇</span><span><b>{set.name}</b><small>{set.extensionIds.length}개 확장 프로그램</small></span><em>›</em></button>)}{!sets.length ? <div className="empty-set">첫 공유 세트를 만들어 보세요.</div> : null}</div>
        <div className="set-editor"><div className="editor-head"><div><p className="eyebrow">SET EDITOR</p><input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="세트 이름" /></div><div><button className="save-set" onClick={() => void saveSet()}>저장</button>{activeSet ? <button className="delete-set" onClick={() => void deleteSet()}>삭제</button> : null}</div></div><ProfileStrip profiles={data?.profiles || []} selected={selectedProfiles} toggle={toggleProfile} /><div className="set-filter"><b>포함할 확장 프로그램</b><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="확장 검색" /></div><div className="extension-picker">{filteredRows.map((row) => <label key={row.id}><input type="checkbox" checked={draftExtensionIds.has(row.id)} onChange={() => setDraftExtensionIds((current) => { const next = new Set(current); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })} /><Logo extension={row} /><span><b>{row.name}</b><small>{row.profiles.size}/{data?.profiles.length || 0}개 프로필에 설치됨</small></span></label>)}</div></div>
      </section>}
    </main>

    <aside className="action-panel"><p className="eyebrow">{view === 'extensions' ? 'QUICK ACTION' : 'APPLY SET'}</p>{view === 'extensions' ? selectedRow ? <><div className="selected-extension"><Logo extension={selectedRow} large /><h3>{selectedRow.name}</h3><p>{selectedRow.id}</p></div><div className="coverage"><span>선택 프로필 설치율</span><b>{[...selectedProfiles].filter((id) => selectedRow.profiles.has(id)).length} / {selectedProfiles.size}</b></div><button className="primary" onClick={() => void installMissing()}>누락 프로필에 설치</button><button className="danger" onClick={() => void removeInstalled()}>설치된 프로필에서 제거</button><p className="hint">공식 Web Store에서 설치 또는 제거를 승인해 주세요.</p></> : <div className="no-selection"><span>↖</span><h3>확장 프로그램 선택</h3><p>매트릭스에서 관리할 항목을 하나 선택하세요.</p></div> : activeSet ? <><div className="set-summary"><span>◇</span><h3>{activeSet.name}</h3><p>{activeSet.extensionIds.length}개 확장 프로그램</p></div><div className="coverage"><span>적용할 프로필</span><b>{selectedProfiles.size}</b></div><button className="primary" onClick={() => void applySet()}>선택 프로필에 세트 적용</button><p className="hint">이미 설치된 항목은 건너뛰고 누락된 확장의 Web Store 페이지만 엽니다.</p></> : <div className="no-selection"><span>◇</span><h3>세트를 선택하세요</h3><p>저장된 세트를 선택하거나 새 세트를 만드세요.</p></div>}{toast ? <div className="toast" onClick={() => setToast('')}>{toast}</div> : null}</aside>
  </div>;
}

export default App;

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Box,
  Layers3,
  Download,
  Upload,
  RotateCcw,
  Focus,
  CircleHelp,
  Check,
  ShieldCheck,
  Grid2X2,
  Spline,
  Undo2,
  X,
  Menu,
  PanelRight,
  Save,
  AlertCircle,
  Pencil,
  CheckCircle2,
  MoreHorizontal,
  BookOpen,
  Cable,
  Play,
  Smile,
} from 'lucide-react';
import { createSampleProject } from './data/sampleRobot';
import { createPersonalRobot } from './data/personalRobot';
import { DesignPanel } from './components/DesignPanel';
import { FacePanel } from './components/FacePanel';
import { robotWires, wireBundle, wireBundles, type WireBundle } from './domain/wiring';
import type { RobotProject } from './domain/schema';
import { downloadFile, parseProject, serializeProject } from './domain/project';
import { exportBomCsv } from './domain/bom';
import { RobotViewport, type View } from './scene/RobotViewport';
import { AssemblyTree } from './components/AssemblyTree';
import { DetailPanel } from './components/DetailPanel';
import { BomPanel } from './components/BomPanel';
import { ChecksPanel } from './components/ChecksPanel';
import { useWebMcp } from './domain/webmcp';
import {
  LIBRARY_KEY,
  loadLibrary,
  openDefaultRobot,
  saveLibrary,
  initialLibrary,
  updateActiveRobot,
  addRobot,
  switchRobot,
  applyPersonalDesign,
} from './domain/library';
import { RobotLibraryDialog } from './components/RobotLibraryDialog';
type Tab = 'model' | 'bom' | 'checks' | 'design' | 'simulation' | 'face';
const SimulationPanel = lazy(() =>
  import('./components/SimulationPanel').then((module) => ({ default: module.SimulationPanel })),
);
export default function App() {
  const [initial] = useState(() => {
    try {
      return {
        library: openDefaultRobot(loadLibrary()),
        error: '',
        raw: localStorage.getItem(LIBRARY_KEY),
      };
    } catch (error) {
      return {
        library: initialLibrary(),
        raw: undefined,
        error: `Không thể mở bản lưu cục bộ. ${error instanceof Error ? error.message : ''} Bản lưu cũ chưa bị ghi đè; hãy tải JSON dự phòng hoặc khôi phục robot mẫu.`,
      };
    }
  });
  const saveBaseline = useRef(initial.raw);
  const [library, setLibrary] = useState(initial.library);
  const currentLibrary = useRef(library);
  currentLibrary.current = library;
  const project = library.projects.find((p) => p.id === library.activeId)!;
  function setProject(edit: RobotProject | ((p: RobotProject) => RobotProject)) {
    setLibrary((l) => updateActiveRobot(l, (p) => (typeof edit === 'function' ? edit(p) : edit)));
  }
  const [nameDraft, setNameDraft] = useState(project.name);
  const [renaming, setRenaming] = useState(false);
  useEffect(() => {
    setNameDraft(project.name);
    setRenaming(false);
  }, [project.id, project.name]);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');
  const [storageBlocked, setStorageBlocked] = useState(!!initial.error);
  const [message, setMessage] = useState(initial.error);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [explode, setExplode] = useState(0);
  const [view, setView] = useState<View>('perspective');
  const [fitToken, setFitToken] = useState(0);
  const [isolate, setIsolate] = useState<string | null>(null);
  const [grid, setGrid] = useState(true);
  const [lines, setLines] = useState(true);
  const [showWires, setShowWires] = useState(!!project.design);
  const [wireBundleFilter, setWireBundleFilter] = useState<WireBundle | 'all'>('all');
  const [wireFocus, setWireFocus] = useState(true);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [designSection, setDesignSection] = useState<'overview' | 'wiring'>('overview');
  const wires = robotWires(project);
  const [tab, setTab] = useState<Tab>('model');
  useEffect(() => {
    document.getElementById(`tab-${tab}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab, project.id]);
  const [mobilePanel, setMobilePanel] = useState<'tree' | 'detail' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const libraryDialog = useRef<HTMLDialogElement>(null);
  const current = useRef(project);
  current.current = project;
  useEffect(() => {
    if (storageBlocked) {
      setSaveState('error');
      return;
    }
    setSaveState('saving');
    let saved = false;
    const persist = () => {
      if (saved) return;
      try {
        saveBaseline.current = saveLibrary(library, localStorage, saveBaseline.current);
        saved = true;
        setSaveState('saved');
      } catch (error) {
        setSaveState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Không thể lưu vào trình duyệt. Hãy tải JSON để giữ lại thay đổi.',
        );
      }
    };
    const timer = setTimeout(persist, 400);
    window.addEventListener('pagehide', persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', persist);
    };
  }, [library, storageBlocked]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobilePanel(null);
        setIsolate(null);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  function update(edit: (p: RobotProject) => RobotProject) {
    setProject((p) => ({ ...edit(p), updatedAt: new Date().toISOString() }));
  }
  function selectPart(id: string | null) {
    setSelected(id);
    if (isolate && id) setIsolate(id);
  }
  function pickPart(id: string) {
    selectPart(id);
    setTab('model');
    const item = project.instances.find((i) => i.id === id);
    if (
      (item && !item.visible) ||
      (item && !project.assemblies.find((a) => a.id === item.assemblyId)?.visible)
    ) {
      update((p) => ({
        ...p,
        instances: p.instances.map((i) => (i.id === id ? { ...i, visible: true } : i)),
        assemblies: p.assemblies.map((a) =>
          a.id === item?.assemblyId ? { ...a, visible: true } : a,
        ),
      }));
    }
    setMobilePanel('detail');
  }
  function togglePart(id: string) {
    update((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)),
    }));
    if (isolate === id) setIsolate(null);
  }
  function toggleAssembly(id: string) {
    update((p) => ({
      ...p,
      assemblies: p.assemblies.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a)),
    }));
    setIsolate(null);
  }
  const inventory = (id: string, value: number) =>
    update((p) => ({ ...p, inventory: { ...p.inventory, [id]: value } }));
  const price = (id: string, value: number | null) =>
    update((p) => ({ ...p, priceOverrides: { ...p.priceOverrides, [id]: value } }));
  const position = (id: string, axis: number, value: number) => {
    update((p) => ({
      ...p,
      instances: p.instances.map((i) =>
        i.id === id
          ? {
              ...i,
              positionMm: i.positionMm.map((v, n) => (n === axis ? value : v)) as [
                number,
                number,
                number,
              ],
            }
          : i,
      ),
    }));
    setFitToken((n) => n + 1);
  };
  const exportJson = () => {
    try {
      downloadFile(
        'robot-studio-project.json',
        serializeProject(current.current),
        'application/json;charset=utf-8',
      );
      setNotice('Đã xuất dự án JSON.');
    } catch {
      setMessage('Không thể xuất dự án. Hãy kiểm tra các dữ liệu vừa chỉnh sửa.');
    }
  };
  const exportCsv = () => {
    downloadFile('robot-studio-bom.csv', exportBomCsv(current.current), 'text/csv;charset=utf-8');
    setNotice('Đã xuất BOM CSV UTF-8.');
  };
  function resetView(nextProject: RobotProject = project) {
    setDesignSection('overview');
    setShowWires(!!nextProject.design);
    setWireBundleFilter('all');
    setWireFocus(true);
    setSelectedWire(null);
    setSelected(null);
    setIsolate(null);
    setExplode(0);
    setView('perspective');
    setFitToken((n) => n + 1);
    setTab('model');
    setMobilePanel(null);
  }
  function showWire(id: string) {
    const wire = wires.find((w) => w.id === id);
    if (!wire && id !== 'all') return;
    const ids = wire
      ? [wire.from.instanceId, wire.to.instanceId]
      : [...new Set(wires.flatMap((w) => [w.from.instanceId, w.to.instanceId]))];
    const parts = project.instances.filter((i) => ids.includes(i.id));
    const assemblies = parts.map((i) => i.assemblyId);
    if (
      parts.some((i) => !i.visible) ||
      project.assemblies.some((a) => assemblies.includes(a.id) && !a.visible)
    ) {
      update((p) => ({
        ...p,
        instances: p.instances.map((i) => (ids.includes(i.id) ? { ...i, visible: true } : i)),
        assemblies: p.assemblies.map((a) =>
          assemblies.includes(a.id) ? { ...a, visible: true } : a,
        ),
      }));
    }
    setSelected(null);
    setIsolate(null);
    setSelectedWire(wire?.id ?? null);
    setWireBundleFilter(wire ? wireBundle(wire) : 'all');
    setWireFocus(true);
    setShowWires(true);
    setTab('model');
    setMobilePanel(null);
    setFitToken((n) => n + 1);
  }
  function replaceProject(next: RobotProject) {
    setProject(next);
    setStorageBlocked(false);
    setMessage('');
    resetView(next);
  }
  function openRobot(id: string) {
    try {
      const next = switchRobot(currentLibrary.current, id);
      const chosen = next.projects.find((p) => p.id === id)!;
      libraryDialog.current?.close();
      setLibrary(next);
      resetView(next.projects.find((p) => p.id === next.activeId)!);
      setNotice(`Đang mở ${chosen.name} · ${chosen.instances.length} chi tiết.`);
      // Persist the complete latest library before a reload can restore the old selection.
      // Keep the compare-and-swap check: another tab's edits must never be overwritten.
      saveBaseline.current = saveLibrary(next, localStorage, saveBaseline.current);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Không thể lưu lựa chọn robot.');
    }
  }
  function createRobot(name: string, source: 'sample' | 'current' | 'personal') {
    try {
      const template =
        source === 'sample'
          ? createSampleProject()
          : source === 'personal'
            ? createPersonalRobot()
            : project;
      const next = addRobot(library, template, name);
      setLibrary(next);
      resetView(next.projects.find((p) => p.id === next.activeId)!);
      libraryDialog.current?.close();
      setNotice(`Đã tạo ${name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo robot.');
    }
  }
  function applyPersonal() {
    try {
      if (localStorage.getItem(LIBRARY_KEY) !== saveBaseline.current)
        throw new Error('Bản lưu đã đổi ở tab khác. Tải lại trang trước khi áp dụng.');
      const next = applyPersonalDesign(library);
      localStorage.setItem(`robot-studio.before-personal.${project.id}`, serializeProject(project));
      saveBaseline.current = saveLibrary(next, localStorage, saveBaseline.current);
      setLibrary(next);
      resetView(next.projects.find((p) => p.id === next.activeId)!);
      libraryDialog.current?.close();
      setNotice('Đã áp dụng cấu hình cá nhân và lưu bản dự phòng của thiết kế cũ.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu bản dự phòng; chưa thay thế thiết kế.',
      );
    }
  }
  function exportPersonalBackup() {
    try {
      const raw = localStorage.getItem(`robot-studio.before-personal.${project.id}`);
      if (!raw) {
        setNotice('Robot này được tạo mới; không có bản trước khi cập nhật.');
        return;
      }
      downloadFile(
        'robot-before-personal-update.json',
        serializeProject(parseProject(raw)),
        'application/json;charset=utf-8',
      );
      setNotice('Đã xuất bản dự phòng trước khi cập nhật.');
    } catch {
      setMessage('Không thể đọc bản dự phòng trên trình duyệt.');
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Tệp vượt quá giới hạn 5 MB.');
      const next = parseProject(await file.text());
      setLibrary(addRobot(currentLibrary.current, next, next.name));
      setStorageBlocked(false);
      setMessage('');
      resetView(next);
      setNotice(`Đã mở dự án ${next.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể đọc tệp JSON. Dự án hiện tại được giữ nguyên.',
      );
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  useWebMcp(project);
  const selectedPart = project.instances.find((i) => i.id === selected);
  const selectedDef = project.definitions.find((d) => d.id === selectedPart?.definitionId);
  const visibleCount = project.instances.filter(
    (i) =>
      project.definitions.find((d) => d.id === i.definitionId)?.geometry !== 'accessory' &&
      (isolate
        ? i.id === isolate
        : i.visible && project.assemblies.find((a) => a.id === i.assemblyId)?.visible),
  ).length;
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Robot Studio">
          <span className="brand-mark">
            <Bot size={23} />
          </span>
          Robot<span>Studio</span>
        </a>
        <button
          className="library-trigger"
          aria-label="Danh sách robot"
          title="Danh sách robot / Tạo robot mới"
          disabled={storageBlocked}
          onClick={() => libraryDialog.current?.showModal()}
        >
          <Layers3 size={18} />
          <span>Robot ({library.projects.length})</span>
        </button>
        <div className="project-title">
          {renaming ? (
            <label className="project-name">
              <input
                autoFocus
                aria-label="Tên dự án"
                value={nameDraft}
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  const name = nameDraft.trim();
                  if (name && name !== project.name) update((p) => ({ ...p, name }));
                  else setNameDraft(project.name);
                  setRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setNameDraft(project.name);
                    setRenaming(false);
                  }
                }}
              />
              <Pencil size={12} />
            </label>
          ) : (
            <div className="robot-picker">
              <select
                aria-label="Robot đang mở"
                value={project.id}
                disabled={storageBlocked}
                onChange={(e) => openRobot(e.target.value)}
              >
                {library.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.instances.length} chi tiết
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Đổi tên robot đang mở"
                title="Đổi tên robot"
                onClick={() => setRenaming(true)}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <span
            className={'save-status ' + saveState}
            role="status"
            aria-label={
              saveState === 'saved'
                ? 'Đã lưu cục bộ'
                : saveState === 'saving'
                  ? 'Đang lưu'
                  : 'Chưa lưu được'
            }
            title={
              saveState === 'saved'
                ? 'Đã lưu cục bộ'
                : saveState === 'saving'
                  ? 'Đang lưu'
                  : 'Chưa lưu được'
            }
          >
            {saveState === 'saved' ? (
              <CheckCircle2 size={14} />
            ) : saveState === 'error' ? (
              <AlertCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>
              {saveState === 'saved'
                ? 'Đã lưu cục bộ'
                : saveState === 'saving'
                  ? 'Đang lưu…'
                  : 'Chưa lưu được'}
            </span>
          </span>
        </div>
        <div className="header-actions">
          <button
            title="Mở dự án JSON"
            aria-label="Mở dự án JSON"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} />
            <span>Mở JSON</span>
          </button>
          <button title="Lưu dự án JSON" aria-label="Lưu dự án JSON" onClick={exportJson}>
            <Download size={16} />
            <span>Lưu JSON</span>
          </button>
          <button className="primary-button" aria-label="Xuất BOM" onClick={exportCsv}>
            <Download size={16} />
            <span>Xuất BOM</span>
          </button>
          <button
            className="icon-button"
            title="Khôi phục robot mẫu"
            aria-label="Khôi phục robot mẫu"
            onClick={() => resetDialog.current?.showModal()}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="icon-button"
            title="Hướng dẫn sử dụng"
            aria-label="Hướng dẫn sử dụng"
            onClick={() => helpDialog.current?.showModal()}
          >
            <CircleHelp size={18} />
          </button>
          <details className="mobile-menu">
            <summary aria-label="Thêm tùy chọn">
              <MoreHorizontal size={19} />
            </summary>
            <div>
              <button onClick={() => resetDialog.current?.showModal()}>
                <RotateCcw size={16} />
                Khôi phục robot mẫu
              </button>
              <button onClick={() => helpDialog.current?.showModal()}>
                <CircleHelp size={16} />
                Hướng dẫn sử dụng
              </button>
            </div>
          </details>
        </div>
        <input
          type="file"
          ref={fileInput}
          accept=".json,application/json"
          aria-label="Nhập tệp dự án"
          hidden
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </header>
      <nav className="workspace-nav" aria-label="Các khu vực thiết kế">
        <div className="workspace-title">
          <span className="eyebrow">KHÔNG GIAN LÀM VIỆC</span>
          <h1>Thiết kế của bạn, thành hình.</h1>
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              { id: 'model', name: 'Mô hình 3D', Icon: Box },
              { id: 'simulation', name: 'Mô phỏng', Icon: Play },
              { id: 'face', name: 'Biểu cảm', Icon: Smile },
              { id: 'bom', name: 'Danh sách vật tư', Icon: Layers3 },
              { id: 'checks', name: 'Kiểm tra tương thích', Icon: ShieldCheck },
              { id: 'design', name: 'Hồ sơ Robot', Icon: BookOpen },
            ] as const
          )
            .filter((t) => !['design', 'simulation', 'face'].includes(t.id) || project.design)
            .map((t) => (
              <button
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                key={t.id}
                onClick={() => {
                  if (t.id === 'design') setDesignSection('overview');
                  setTab(t.id);
                  setMobilePanel(null);
                }}
              >
                <t.Icon size={17} />
                {t.name}
              </button>
            ))}
        </div>
      </nav>
      {message && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{message}</span>
          <button aria-label="Đóng thông báo lỗi" onClick={() => setMessage('')}>
            <X size={17} />
          </button>
        </div>
      )}
      <main key={project.id} className={'workspace ' + (tab === 'model' ? '' : 'data-workspace')}>
        {tab === 'model' ? (
          <>
            <aside
              className={'left-panel ' + (mobilePanel === 'tree' ? 'mobile-open' : '')}
              aria-label="Cây lắp ráp"
            >
              <AssemblyTree
                project={project}
                selected={selected}
                onSelect={(id) => {
                  selectPart(id);
                  setMobilePanel(null);
                }}
                onTogglePart={togglePart}
                onToggleAssembly={toggleAssembly}
                onClose={() => setMobilePanel(null)}
                onBom={() => {
                  setTab('bom');
                  setMobilePanel(null);
                }}
              />
            </aside>
            <section
              className={`stage ${showWires ? 'wiring-mode' : ''}`}
              role="tabpanel"
              id="panel-model"
              aria-labelledby="tab-model"
            >
              <div className="stage-heading">
                <span className="stage-label">
                  {project.name.toUpperCase().replace(' ', ' / ')}
                </span>
                <span className="pill">
                  {project.design ? 'Bố trí theo yêu cầu · cần đo xác nhận' : 'Mô hình minh họa'}
                </span>
              </div>
              <RobotViewport
                project={project}
                selected={selected}
                onSelect={selectPart}
                explode={explode}
                isolate={isolate}
                view={view}
                fitToken={fitToken}
                grid={grid}
                lines={lines}
                showWires={showWires}
                selectedWire={selectedWire}
                wireBundleFilter={wireBundleFilter}
                wireFocus={wireFocus}
                onSelectWire={(id) => {
                  setSelectedWire(id);
                  setSelected(null);
                }}
              />
              <div className="mobile-panel-buttons">
                <button
                  aria-label="Mở cây lắp ráp"
                  className="tree-toggle"
                  onClick={() => setMobilePanel('tree')}
                >
                  <Menu size={18} />
                  <span>Cấu trúc</span>
                </button>
                <button
                  aria-label="Mở thông tin bộ phận"
                  className="detail-toggle"
                  onClick={() => setMobilePanel('detail')}
                >
                  <PanelRight size={18} />
                  <span>Thông tin</span>
                </button>
              </div>
              {project.design && !showWires && !isolate && (
                <button
                  className="open-wire-mode"
                  onClick={() => {
                    setShowWires(true);
                    setIsolate(null);
                  }}
                >
                  <Cable size={15} /> Xem dây & chân cắm
                </button>
              )}
              <div className="stage-tools">
                {project.design && (
                  <button
                    aria-label="Biểu cảm trên điện thoại"
                    title="Biểu cảm trên điện thoại"
                    onClick={() => setTab('face')}
                  >
                    <Smile size={19} />
                  </button>
                )}
                {project.design && (
                  <button
                    aria-label="Bật tắt dây dẫn"
                    title="Dây dẫn nguồn và tín hiệu"
                    aria-pressed={showWires}
                    className={showWires ? 'active' : ''}
                    onClick={() => {
                      setShowWires(!showWires);
                      setIsolate(null);
                    }}
                  >
                    <Cable size={19} />
                  </button>
                )}
                <button
                  title="Vừa khung nhìn"
                  aria-label="Vừa khung nhìn"
                  onClick={() => setFitToken((n) => n + 1)}
                >
                  <Focus size={19} />
                </button>
                <button
                  aria-label="Bật tắt lưới"
                  title="Bật / tắt lưới"
                  aria-pressed={grid}
                  className={grid ? 'active' : ''}
                  onClick={() => setGrid(!grid)}
                >
                  <Grid2X2 size={18} />
                </button>
                <button
                  aria-label="Bật tắt đường nối"
                  title="Đường nối vị trí lắp"
                  aria-pressed={lines}
                  className={lines ? 'active' : ''}
                  onClick={() => setLines(!lines)}
                >
                  <Spline size={19} />
                </button>
              </div>
              {showWires && (
                <div className="stage-wire-selector">
                  <div className="stage-wire-row">
                    <Cable size={17} />
                    <select
                      aria-label="Bó dây trên mô hình 3D"
                      value={wireBundleFilter}
                      onChange={(e) => {
                        setWireBundleFilter(e.target.value as WireBundle | 'all');
                        setSelectedWire(null);
                        setSelected(null);
                      }}
                    >
                      <option value="all">Toàn bộ robot · {wires.length} liên kết</option>
                      {Object.entries(wireBundles).map(([id, info]) => (
                        <option key={id} value={id}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label="Mở giải thích dây dẫn"
                      onClick={() => {
                        if (!selectedWire)
                          setSelectedWire(
                            wires.find(
                              (w) =>
                                wireBundleFilter === 'all' || wireBundle(w) === wireBundleFilter,
                            )?.id ?? null,
                          );
                        setDesignSection('wiring');
                        setTab('design');
                        setMobilePanel(null);
                      }}
                    >
                      Sơ đồ & giải thích ↗
                    </button>
                  </div>
                  <div className="stage-wire-row">
                    <select
                      aria-label="Dây trên mô hình 3D"
                      value={selectedWire ?? ''}
                      onChange={(e) => {
                        setSelectedWire(e.target.value || null);
                        setSelected(null);
                      }}
                    >
                      <option value="">Chọn từng dây để xem rõ hai đầu</option>
                      {wires
                        .filter(
                          (w) => wireBundleFilter === 'all' || wireBundle(w) === wireBundleFilter,
                        )
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.id} · {w.from.pin} ↔ {w.to.pin}
                          </option>
                        ))}
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={wireFocus}
                        onChange={(e) => setWireFocus(e.target.checked)}
                      />
                      Làm mờ vật che
                    </label>
                  </div>
                  <small>
                    {wireBundleFilter === 'all'
                      ? 'Dây liền: cáp cần đấu · nét đứt ngắn: đường có sẵn trong bo · tím: Wi-Fi. Công tắc ở ON trong sơ đồ.'
                      : wireBundles[wireBundleFilter].hint}
                  </small>
                </div>
              )}
              {isolate && (
                <button className="isolate-banner" onClick={() => setIsolate(null)}>
                  <Undo2 size={15} />
                  Đang xem riêng · Trở lại toàn bộ
                </button>
              )}
              {!visibleCount && (
                <div className="no-parts">
                  <Box size={30} />
                  <h3>Các bộ phận đang được ẩn</h3>
                  <button
                    className="primary-button"
                    onClick={() =>
                      update((p) => ({
                        ...p,
                        instances: p.instances.map((i) => ({ ...i, visible: true })),
                        assemblies: p.assemblies.map((a) => ({ ...a, visible: true })),
                      }))
                    }
                  >
                    Hiện toàn bộ robot
                  </button>
                </div>
              )}
              <div className="view-controls" aria-label="Góc nhìn">
                {(['perspective', 'front', 'side', 'top'] as View[]).map((v, n) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    className={view === v ? 'active' : ''}
                    onClick={() => {
                      setView(v);
                      setFitToken((t) => t + 1);
                    }}
                  >
                    {['Phối cảnh', 'Trước', 'Bên', 'Trên'][n]}
                  </button>
                ))}
              </div>
              <div className="stage-caption">
                <span>Kéo để xoay · Chuột phải để pan · Cuộn để zoom</span>
                <span>{visibleCount} chi tiết · mm</span>
              </div>
              <div className="explode-panel">
                <div>
                  <Layers3 size={18} />
                  <label htmlFor="explode-range">Tách bộ phận</label>
                  <output htmlFor="explode-range">{explode}%</output>
                </div>
                <input
                  id="explode-range"
                  aria-label="Tách bộ phận"
                  aria-valuetext={`${explode} phần trăm`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={explode}
                  style={{ '--progress': `${explode}%` } as React.CSSProperties}
                  onChange={(e) => setExplode(+e.target.value)}
                  onPointerUp={() => setFitToken((n) => n + 1)}
                  onKeyUp={(e) => {
                    if (
                      ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(
                        e.key,
                      )
                    )
                      setFitToken((n) => n + 1);
                  }}
                />
                <button
                  className="quiet-button"
                  onClick={() => {
                    setExplode(0);
                    setFitToken((n) => n + 1);
                  }}
                >
                  <RotateCcw size={15} />
                  Lắp lại
                </button>
              </div>
            </section>
            <aside
              className={'right-panel ' + (mobilePanel === 'detail' ? 'mobile-open' : '')}
              aria-label="Thông tin chi tiết"
            >
              <DetailPanel
                project={project}
                selected={selected}
                isolate={isolate}
                onIsolate={() => {
                  setIsolate(isolate ? null : selected);
                  setMobilePanel(null);
                }}
                onToggle={() => {
                  if (selected) {
                    if (
                      selectedPart &&
                      !project.assemblies.find((a) => a.id === selectedPart.assemblyId)?.visible
                    ) {
                      toggleAssembly(selectedPart.assemblyId);
                    } else togglePart(selected);
                  }
                }}
                onClose={() => setMobilePanel(null)}
                onClear={() => {
                  setSelected(null);
                  setIsolate(null);
                }}
                onFit={() => setFitToken((n) => n + 1)}
                onBom={() => {
                  setTab('bom');
                  setMobilePanel(null);
                }}
                onInventory={inventory}
                onPrice={price}
                onPosition={position}
                onExplainWire={(id) => {
                  setSelectedWire(id);
                  setDesignSection('wiring');
                  setTab('design');
                  setMobilePanel(null);
                }}
              />
            </aside>
            {mobilePanel && (
              <button
                className="panel-backdrop"
                aria-label="Đóng bảng bên"
                onClick={() => setMobilePanel(null)}
              />
            )}
          </>
        ) : (
          <section
            role="tabpanel"
            id={`panel-${tab}`}
            key={`${project.id}-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="data-tab"
          >
            {tab === 'bom' ? (
              <BomPanel
                project={project}
                onInventory={inventory}
                onPrice={price}
                onPick={pickPart}
                onExport={exportCsv}
              />
            ) : tab === 'design' ? (
              <DesignPanel
                key={project.id}
                project={project}
                onChange={update}
                onPick={pickPart}
                onShowWire={showWire}
                initialSection={designSection}
                initialWire={selectedWire}
              />
            ) : tab === 'face' ? (
              <FacePanel
                project={project}
                onChange={update}
                onShowPhone={() => {
                  const phone = project.instances.find(
                    (i) =>
                      project.definitions.find((d) => d.id === i.definitionId)?.geometry ===
                      'phone',
                  );
                  if (!phone) return;
                  pickPart(phone.id);
                  setMobilePanel(null);
                  setShowWires(false);
                  setSelectedWire(null);
                  setIsolate(phone.id);
                  setExplode(0);
                  setView('face');
                  setFitToken((n) => n + 1);
                }}
              />
            ) : tab === 'simulation' ? (
              <Suspense fallback={<p role="status">Đang mở phòng mô phỏng…</p>}>
                <SimulationPanel key={project.id} project={project} />
              </Suspense>
            ) : (
              <ChecksPanel project={project} onPick={pickPart} />
            )}
          </section>
        )}
      </main>
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          {selectedPart
            ? `${selectedPart.name}${selectedDef?.geometry === 'accessory' ? ' · chỉ trong BOM' : ''}`
            : 'Sẵn sàng khám phá'}
        </span>
        <span>Lưu trên trình duyệt này · Không cần tài khoản</span>
        <span>Đơn vị: mm · g · VND</span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      <RobotLibraryDialog
        dialog={libraryDialog}
        library={library}
        onSwitch={openRobot}
        onCreate={createRobot}
        onApplyPersonal={applyPersonal}
        onExportBackup={exportPersonalBackup}
      />
      <dialog ref={resetDialog} className="modal" aria-label="Khôi phục robot mẫu">
        <div className="modal-icon">
          <RotateCcw size={25} />
        </div>
        <h2>Khôi phục robot mẫu?</h2>
        <p>
          Chỉ robot đang mở được thay bằng dữ liệu mẫu; các robot khác được giữ nguyên. Tải JSON
          trước nếu bạn muốn giữ một bản dự phòng.
        </p>
        <div className="modal-actions">
          <button onClick={exportJson}>
            <Download size={16} />
            Tải JSON dự phòng
          </button>
          <button onClick={() => resetDialog.current?.close()}>Hủy</button>
          <button
            className="primary-button"
            onClick={() => {
              replaceProject({ ...createSampleProject(), name: project.name });
              resetDialog.current?.close();
              setNotice('Đã khôi phục robot mẫu.');
            }}
          >
            Khôi phục
          </button>
        </div>
      </dialog>
      <dialog ref={helpDialog} className="modal help-modal" aria-label="Hướng dẫn Robot Studio">
        <button
          className="modal-close"
          aria-label="Đóng hướng dẫn"
          onClick={() => helpDialog.current?.close()}
        >
          <X size={20} />
        </button>
        <div className="modal-icon">
          <Bot size={27} />
        </div>
        <h2>Chào mừng đến Robot Studio</h2>
        <p>Một bàn làm việc nhỏ để khám phá robot trước khi chọn linh kiện.</p>
        <dl className="help-list">
          <dt>Xoay / dịch chuyển / thu phóng</dt>
          <dd>
            Kéo chuột trái / chuột phải / cuộn. Trên màn hình cảm ứng: kéo một ngón để xoay; hai
            ngón để pan và zoom.
          </dd>
          <dt>Chọn & xem riêng</dt>
          <dd>
            Bấm mô hình hoặc tên bộ phận trong cây. Mở thông tin để xem riêng hoặc ẩn bộ phận.
          </dd>
          <dt>Tách bộ phận</dt>
          <dd>
            Bấm hoặc kéo thanh trượt. Khi thanh được chọn, dùng phím mũi tên, Home và End. Bấm “Lắp
            lại” để về đúng vị trí ban đầu.
          </dd>
          <dt>Vật tư & lưu dự án</dt>
          <dd>
            Chỉnh số lượng đã có và đơn giá, rồi rời ô để lưu. Dự án tự lưu trong trình duyệt. Dùng
            JSON để sao lưu hoặc chuyển sang thiết bị khác; CSV để xem BOM trong bảng tính.
          </dd>
        </dl>
        <div className="info-card">
          <CircleHelp size={18} />
          <p>
            Tất cả dữ liệu mẫu đều là minh họa, chưa dùng để đặt mua. Các kiểm tra sơ bộ không xác
            nhận an toàn hoặc sẵn sàng chế tạo.
          </p>
        </div>
      </dialog>
    </div>
  );
}

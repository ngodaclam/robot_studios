import { useState } from 'react';
import { normalizeSearch as normalize } from '../domain/search';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  Search,
  X,
  Package,
} from 'lucide-react';
import type { RobotProject } from '../domain/schema';

interface Props {
  project: RobotProject;
  selected: string | null;
  onSelect: (id: string) => void;
  onTogglePart: (id: string) => void;
  onToggleAssembly: (id: string) => void;
  onClose: () => void;
  onBom: () => void;
}
export function AssemblyTree({
  project,
  selected,
  onSelect,
  onTogglePart,
  onToggleAssembly,
  onClose,
  onBom,
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set([
      'power',
      'electronics',
      'sensors',
      'accessories',
      'chassis',
      'control',
      'planned',
      'service',
    ]),
  );
  let count = 0;
  return (
    <>
      <div className="panel-heading">
        <h2>Cấu trúc lắp ráp</h2>
        <Layers3 size={17} />
        <button className="mobile-close" aria-label="Đóng cây lắp ráp" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <label className="search">
        <Search size={16} />
        <input
          aria-label="Tìm bộ phận"
          placeholder="Tìm bộ phận…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button aria-label="Xóa tìm kiếm" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </label>
      <div className="tree-scroll">
        <div className="tree-root">
          <Box size={18} />
          <strong>{project.name}</strong>
          <span>{project.assemblies.length.toString().padStart(2, '0')}</span>
        </div>
        {project.assemblies.map((a) => {
          const all = project.instances.filter((i) => i.assemblyId === a.id);
          const parts = all.filter(
            (i) =>
              normalize(
                i.name + ' ' + project.definitions.find((d) => d.id === i.definitionId)?.sku,
              ).includes(normalize(search)) || normalize(a.name).includes(normalize(search)),
          );
          if (!parts.length) return null;
          count += parts.length;
          const open = !!search || !collapsed.has(a.id);
          const accessories = a.id === 'accessories';
          const shownParts = parts.filter(
            (part, index) =>
              project.definitions.find((d) => d.id === part.definitionId)?.geometry !==
                'accessory' ||
              parts.findIndex((i) => i.definitionId === part.definitionId) === index,
          );
          return (
            <div key={a.id} className={'assembly ' + (!a.visible ? 'assembly-hidden' : '')}>
              <div className="assembly-heading">
                <button
                  aria-expanded={open}
                  aria-label={`${open ? 'Thu gọn' : 'Mở'} ${a.name}`}
                  onClick={() =>
                    setCollapsed((old) => {
                      const next = new Set(old);
                      if (next.has(a.id)) next.delete(a.id);
                      else next.add(a.id);
                      return next;
                    })
                  }
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <strong>{a.name}</strong>
                  <span className="count">{all.length}</span>
                </button>
                {!accessories && (
                  <button
                    aria-label={`${a.visible ? 'Ẩn' : 'Hiện'} cụm ${a.name}`}
                    title={`${a.visible ? 'Ẩn' : 'Hiện'} cụm`}
                    onClick={() => onToggleAssembly(a.id)}
                  >
                    {a.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                )}
              </div>
              {open &&
                (accessories ? (
                  <button className="accessory-link" onClick={onBom}>
                    <Package size={15} />
                    {parts.length} phụ kiện trong BOM
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  shownParts.map((i) => {
                    const accessory =
                      project.definitions.find((d) => d.id === i.definitionId)?.geometry ===
                      'accessory';
                    const quantity = accessory
                      ? parts.filter((p) => p.definitionId === i.definitionId).length
                      : 1;
                    return (
                      <div
                        className={
                          'part-row ' +
                          (selected === i.id ? 'selected' : '') +
                          (!i.visible ? ' part-hidden' : '')
                        }
                        key={i.id}
                      >
                        <button
                          className="tree-part"
                          aria-pressed={selected === i.id}
                          onClick={() => onSelect(i.id)}
                        >
                          <span className="part-dot" />
                          <span>
                            {i.name}
                            {quantity > 1 ? ` × ${quantity}` : ''}
                          </span>
                        </button>
                        {!accessory && (
                          <button
                            className="part-eye"
                            aria-label={`${i.visible ? 'Ẩn' : 'Hiện'} ${i.name}`}
                            title={`${i.visible ? 'Ẩn' : 'Hiện'} ${i.name}`}
                            onClick={() => onTogglePart(i.id)}
                          >
                            {i.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        )}
                      </div>
                    );
                  })
                ))}
            </div>
          );
        })}
        {count === 0 && (
          <div className="empty-state">
            Không tìm thấy bộ phận.<button onClick={() => setSearch('')}>Xóa tìm kiếm</button>
          </div>
        )}
      </div>
      <div className="tree-footer">
        <span className="status-dot" />
        {project.instances.length} chi tiết · {project.assemblies.length} cụm
      </div>
    </>
  );
}

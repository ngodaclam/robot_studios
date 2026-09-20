import type { RobotProject } from '../domain/schema';
import { wireBundle, wireBundles, type RobotWire } from '../domain/wiring';

export function HarnessDiagram({
  project,
  wires,
  selected,
  onSelect,
}: {
  project: RobotProject;
  wires: RobotWire[];
  selected: RobotWire;
  onSelect: (id: string) => void;
}) {
  const bundle = wireBundle(selected);
  const routes = wires.filter((w) => wireBundle(w) === bundle);
  const name = (id: string) =>
    ({
      shield: 'MKE-B01 · Shield',
      driver: 'MKE-M17 · Driver',
      sonar: 'MKE-S01 · Siêu âm',
      esp32: 'MKE-K01 · ESP32',
      holder: 'Khay pin 2S',
      switch: 'Công tắc',
      'cell-a': 'Cell 18650 số 1',
      'cell-b': 'Cell 18650 số 2',
    })[id] ??
    project.instances.find((i) => i.id === id)?.name ??
    id;
  return (
    <section className="harness-diagram" aria-label="Sơ đồ nối chân">
      <div>
        <strong>{wireBundles[bundle].label}</strong>
        <small>Bấm một dây để tô sáng hai đầu</small>
      </div>
      <div className="harness-rows">
        {routes.map((w) => {
          // Keep the shield on the left for all four sonar conductors.
          const ends = w.from.instanceId === 'sonar' ? [w.to, w.from] : [w.from, w.to];
          return (
            <button
              key={w.id}
              className={w.id === selected.id ? 'active' : ''}
              aria-label={`Sơ đồ ${w.id}: ${w.from.pin} nối ${w.to.pin}`}
              aria-pressed={w.id === selected.id}
              onClick={() => onSelect(w.id)}
              style={{ '--wire-color': w.color } as React.CSSProperties}
            >
              <span>
                <small>{name(ends[0].instanceId)}</small>
                <b>{ends[0].pin}</b>
              </span>
              <span className={`diagram-cable ${w.medium}`}>
                <i />
                <em>{w.id}</em>
                <i />
              </span>
              <span>
                <small>{name(ends[1].instanceId)}</small>
                <b>{ends[1].pin}</b>
              </span>
            </button>
          );
        })}
      </div>
      <p>{wireBundles[bundle].hint}</p>
      <small>Sơ đồ theo tên chân; không biểu diễn thứ tự trái/phải của giắc khi lật bo.</small>
    </section>
  );
}

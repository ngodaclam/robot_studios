import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../data/sampleRobot';
import { createPersonalRobot } from '../data/personalRobot';
import {
  addRobot,
  initialLibrary,
  LIBRARY_KEY,
  loadLibrary,
  openDefaultRobot,
  saveLibrary,
  switchRobot,
  updateActiveRobot,
} from './library';
import { STORAGE_KEY, serializeProject } from './project';
const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};
describe('Multi-robot library', () => {
  it('opens Robot 02 first on startup without losing edits or preventing later switching', () => {
    const storage = memory();
    const library = loadLibrary(storage);
    const rover = library.projects[0];
    const personal = library.projects[1];
    personal.design!.tests[0].notes = 'Giữ nhật ký';
    const before = structuredClone(library);
    const startup = openDefaultRobot(library);
    expect(startup.activeId).toBe(personal.id);
    expect(startup.projects).toEqual([personal, rover]);
    expect(library).toEqual(before);
    const switched = switchRobot(startup, rover.id);
    expect(switched.activeId).toBe(rover.id);
    saveLibrary(switched, storage);
    expect(openDefaultRobot(loadLibrary(storage))).toEqual(startup);
  });
  it('recognizes a renamed Robot 02 and leaves libraries without a personal robot intact', () => {
    const library = loadLibrary(memory());
    library.projects[1].id = 'renamed-robot';
    library.projects[1].name = 'Bạn đồng hành';
    expect(openDefaultRobot(library).activeId).toBe('renamed-robot');
    const roverOnly = initialLibrary();
    expect(openDefaultRobot(roverOnly)).toBe(roverOnly);
  });
  it('starts an empty browser with Rover 01 and the complete personal Robot 02', () => {
    const storage = memory();
    const library = loadLibrary(storage);
    expect(library.projects.map((p) => p.name)).toEqual(['Rover 01', 'Robot 02']);
    expect(library.projects[1].design?.profile).toBe('personal-v1');
    expect(library.projects[1].instances).toHaveLength(70);
    expect(library.activeId).toBe(library.projects[0].id);
    expect(storage.getItem(LIBRARY_KEY)).toBeNull();
    const selected = switchRobot(library, library.projects[1].id);
    saveLibrary(selected, storage, null);
    expect(loadLibrary(storage)).toEqual(selected);
  });
  it('upgrades an existing one-robot browser without overwriting edits or changing selection', () => {
    const storage = memory();
    const old = initialLibrary();
    old.projects[0].name = 'Xe của mình';
    old.projects[0].inventory.motor = 7;
    old.projects[0].priceOverrides.motor = 123456;
    old.projects[0].instances[0].positionMm = [10, 20, 30];
    const baseline = saveLibrary(old, storage);
    const upgraded = loadLibrary(storage);
    expect(upgraded.projects).toHaveLength(2);
    expect(upgraded.projects[0]).toEqual(old.projects[0]);
    expect(upgraded.activeId).toBe(old.activeId);
    expect(storage.getItem(LIBRARY_KEY)).toBe(baseline);
    saveLibrary(upgraded, storage, baseline);
    expect(loadLibrary(storage)).toEqual(upgraded);
  });
  it('recognizes a renamed personal robot with a generated ID and retains its journal', () => {
    const storage = memory();
    const personal = createPersonalRobot();
    personal.id = 'my-custom-personal-id';
    personal.name = 'Robot phòng ngủ';
    personal.design!.tests[0].notes = 'Ghi chú đang lưu';
    const library = addRobot(initialLibrary(), personal, personal.name);
    saveLibrary(library, storage);
    expect(loadLibrary(storage)).toEqual(library);
  });
  it('does not replace a different design already using the bundled ID or name', () => {
    const storage = memory();
    const custom = createSampleProject();
    custom.id = 'personal-robot-02';
    custom.name = 'Robot 02';
    const old = initialLibrary(custom);
    saveLibrary(old, storage);
    const upgraded = loadLibrary(storage);
    expect(upgraded.projects[0]).toEqual(custom);
    expect(upgraded.projects[1].id).not.toBe(custom.id);
    expect(upgraded.projects[1].name).not.toBe(custom.name);
    expect(upgraded.projects[1].design?.profile).toBe('personal-v1');
    saveLibrary(upgraded, storage);
    expect(loadLibrary(storage)).toEqual(upgraded);
  });
  it('keeps a full library intact instead of exceeding its storage schema capacity', () => {
    const storage = memory();
    const base = createSampleProject();
    const full = {
      version: 1 as const,
      activeId: 'r-0',
      projects: Array.from({ length: 100 }, (_, i) => ({ ...base, id: `r-${i}` })),
    };
    saveLibrary(full, storage);
    expect(loadLibrary(storage)).toEqual(full);
  });
  it('migrates legacy data without losing BOM, positions, names or overwriting its backup', () => {
    const storage = memory();
    const robot = createSampleProject();
    robot.name = 'Robot đã có';
    robot.inventory.motor = 9;
    robot.instances[0].positionMm = [12, 55, 19];
    storage.setItem(STORAGE_KEY, serializeProject(robot));
    const legacy = storage.getItem(STORAGE_KEY);
    const library = loadLibrary(storage);
    expect(library.projects[0]).toEqual(robot);
    expect(library.projects).toHaveLength(2);
    expect(library.projects[1].design?.profile).toBe('personal-v1');
    saveLibrary(library, storage);
    expect(storage.getItem(STORAGE_KEY)).toBe(legacy);
    expect(loadLibrary(storage)).toEqual(library);
  });
  it('creates independent robots even from identical source IDs', () => {
    const source = createSampleProject();
    let library = initialLibrary(source);
    library = addRobot(library, source, 'Robot 02');
    expect(library.projects[0].id).not.toBe(library.projects[1].id);
    library = updateActiveRobot(library, (p) => {
      p.inventory.motor = 12;
      p.instances[0].positionMm[0] = 999;
      return p;
    });
    expect(source.inventory.motor).toBeUndefined();
    expect(source.instances[0].positionMm[0]).toBe(0);
  });
  it('keeps unsaved edits when switching rapidly and saves the active robot with the entire library', () => {
    let l = loadLibrary(memory());
    const first = l.activeId;
    l = updateActiveRobot(l, (p) => ({
      ...p,
      inventory: { motor: 3 },
      priceOverrides: { motor: 0 },
    }));
    l = addRobot(l, createSampleProject(), 'Robot 02');
    const second = l.activeId;
    l = updateActiveRobot(l, (p) => ({
      ...p,
      inventory: { motor: 1 },
      priceOverrides: { motor: null },
    }));
    l = switchRobot(l, first);
    expect(l.projects[0].inventory.motor).toBe(3);
    expect(l.projects.find((p) => p.id === second)?.inventory.motor).toBe(1);
    l = switchRobot(l, second);
    const storage = memory();
    saveLibrary(l, storage);
    expect(loadLibrary(storage)).toEqual(l);
  });
  it('resets only the active design and retains its identity', () => {
    let l = addRobot(initialLibrary(), createSampleProject(), 'Robot 02');
    const id = l.activeId;
    const first = structuredClone(l.projects[0]);
    l = updateActiveRobot(l, () => createSampleProject());
    expect(l.projects[0]).toEqual(first);
    expect(l.projects[1].id).toBe(id);
  });
  it('imports the same project as new independent entries rather than overwriting', () => {
    const source = createSampleProject();
    let l = initialLibrary(source);
    l = addRobot(l, source, source.name);
    l = addRobot(l, source, source.name);
    expect(new Set(l.projects.map((p) => p.id)).size).toBe(3);
  });
  it('rejects corrupted libraries instead of silently loading an old backup', () => {
    const storage = memory();
    storage.setItem(STORAGE_KEY, serializeProject(createSampleProject()));
    storage.setItem(LIBRARY_KEY, '{bad');
    expect(() => loadLibrary(storage)).toThrow('không hợp lệ');
    expect(storage.getItem(LIBRARY_KEY)).toBe('{bad');
  });
  it('validates active references, duplicate IDs, names and capacity', () => {
    const storage = memory();
    const l = initialLibrary();
    expect(() => saveLibrary({ ...l, activeId: 'missing' }, storage)).toThrow();
    expect(() =>
      saveLibrary({ ...l, projects: [...l.projects, ...l.projects] }, storage),
    ).toThrow();
    expect(() => addRobot(l, l.projects[0], '  ')).toThrow();
    expect(() => switchRobot(l, 'missing')).toThrow();
    expect(() =>
      addRobot({ ...l, projects: Array(100).fill(l.projects[0]) }, l.projects[0], 'new'),
    ).toThrow('100');
  });
});
it('prevents an older browser tab from overwriting newly created robots', () => {
  const storage = memory();
  const original = loadLibrary(memory());
  const baseline = saveLibrary(original, storage);
  const next = addRobot(original, createSampleProject(), 'Robot 02');
  saveLibrary(next, storage, baseline);
  expect(() => saveLibrary(original, storage, baseline)).toThrow('tab khác');
  expect(loadLibrary(storage)).toEqual(next);
});

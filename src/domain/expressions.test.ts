import { describe, expect, it } from 'vitest';
import { createPersonalRobot } from '../data/personalRobot';
import { parseProject, serializeProject } from './project';
import { defaultFace, simulationExpression } from './expressions';
import { defaultSimConfig, initialSimulation } from './simulation';
import { initialLibrary, addRobot, switchRobot, updateActiveRobot } from './library';

describe('phone expressions', () => {
  it('opens older projects and round-trips the new settings without changing hardware', () => {
    const project = createPersonalRobot();
    expect(parseProject(serializeProject(project)).design?.face ?? defaultFace).toEqual(
      defaultFace,
    );
    project.design!.face = { expression: 'curious', auto: false };
    const copy = parseProject(serializeProject(project));
    expect(copy.design?.face).toEqual({ expression: 'curious', auto: false });
    expect(copy.instances).toEqual(project.instances);
    expect(copy.design?.tests).toEqual(project.design?.tests);
    const bad = JSON.parse(serializeProject(copy));
    bad.design.face.expression = 'invalid';
    expect(() => parseProject(JSON.stringify(bad))).toThrow();
  });
  it('keeps face preferences with their own robot across switching', () => {
    let library = initialLibrary();
    const original = library.projects.find((p) => p.id === library.activeId)!;
    library = addRobot(library, createPersonalRobot(), 'Robot biểu cảm');
    const personalId = library.activeId;
    library = updateActiveRobot(library, (p) => ({
      ...p,
      design: { ...p.design!, face: { expression: 'sad', auto: false } },
    }));
    library = switchRobot(library, original.id);
    expect(library.projects.find((p) => p.id === original.id)).toEqual(original);
    library = switchRobot(library, personalId);
    expect(library.projects.find((p) => p.id === personalId)?.design?.face).toEqual({
      expression: 'sad',
      auto: false,
    });
  });
  it('shows faults before sleep or alarm and normal expressions after recovery', () => {
    const state = initialSimulation();
    const config = defaultSimConfig();
    expect(simulationExpression(state, config, false, 1, false)).toBe('sleepy');
    for (const fault of [
      { emergency: true },
      { link: false },
      { sensor: false },
      { voltage: 6.9 },
      { voltage: 8.5 },
    ])
      expect(simulationExpression(state, { ...config, ...fault }, false, 0.2, true)).toBe('alert');
    expect(simulationExpression(state, config, true, 1, true)).toBe('surprised');
    expect(simulationExpression(state, config, true, 0.25, false)).toBe('surprised');
    expect(simulationExpression(state, { ...config, mode: 'avoid' }, true, 1, false)).toBe(
      'curious',
    );
    expect(
      simulationExpression(
        { ...state, leftSpeed: -0.1, rightSpeed: 0.1 },
        config,
        true,
        null,
        false,
      ),
    ).toBe('curious');
    expect(simulationExpression(state, config, true, null, false)).toBe('happy');
  });
});

import { createSampleProject } from './sampleRobot';
import type { RobotProject } from '../domain/schema';
/** All values below are fabricated test cases, not product specifications. */
export function compatibilityFixture(kind: 'pass' | 'fail' | 'unknown'): RobotProject {
  const p = createSampleProject();
  if (kind === 'pass') {
    p.definitions.find((d) => d.id === 'battery')!.ports[0].currentA = 6;
    p.definitions.find((d) => d.id === 'switch')!.ports[0].currentA = 4;
    p.definitions.find((d) => d.id === 'converter')!.ports[0].currentA = 1;
    p.definitions.find((d) => d.id === 'sensor')!.ports.find((p) => p.id === 'echo')!.voltageV = [
      3.3, 3.3,
    ];
  } else if (kind === 'fail') {
    p.definitions
      .find((d) => d.id === 'converter')!
      .ports.find((p) => p.id === 'output')!.voltageV = [11.5, 12.5];
    p.definitions.find((d) => d.id === 'driver')!.ports.find((p) => p.id === 'motors')!.channels =
      1;
    p.definitions.find((d) => d.id === 'driver')!.ports.find((p) => p.id === 'motors')!.currentA =
      0.5;
    p.definitions
      .find((d) => d.id === 'driver')!
      .ports.find((p) => p.id === 'motors')!.perChannelCurrentA = 0.3;
    p.definitions.find((d) => d.id === 'sensor')!.ports.find((p) => p.id === 'echo')!.voltageV = [
      5, 5,
    ];
    p.definitions.find((d) => d.id === 'wheel')!.ports[0].diameterMm = 6;
    p.connections = p.connections.filter((c) => c.to.instanceId !== 'camera-1');
  } else {
    for (const d of p.definitions)
      for (const port of d.ports) {
        delete port.voltageV;
        delete port.currentA;
        delete port.perChannelCurrentA;
        delete port.diameterMm;
        delete port.channels;
      }
  }
  return p;
}

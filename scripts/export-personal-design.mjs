import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

// These modules have type-only imports, so their transformed JS is self-contained.
async function loadDataModule(path) {
  const { code } = await transformWithEsbuild(await readFile(path, 'utf8'), path, { loader: 'ts' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { createPersonalRobot } = await loadDataModule('src/data/personalRobot.ts');
const { exportBomCsv } = await loadDataModule('src/domain/bom.ts');
const project = createPersonalRobot();
await mkdir('public/documents', { recursive: true });
await writeFile('public/documents/robot-02-design.json', JSON.stringify(project, null, 2) + '\n');
await writeFile('public/documents/robot-02-bom.csv', exportBomCsv(project));
console.log(
  `Exported Robot 02: ${project.instances.length} instances, ${project.definitions.length} part types.`,
);

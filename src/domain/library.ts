import { z } from 'zod';
import { projectSchema, type RobotProject } from './schema';
import { createSampleProject } from '../data/sampleRobot';
import { loadProject } from './project';
import { createPersonalRobot } from '../data/personalRobot';
export const LIBRARY_KEY = 'robot-studio.library.v1';
const librarySchema = z
  .object({
    version: z.literal(1),
    activeId: z.string(),
    projects: z.array(projectSchema).min(1).max(100),
  })
  .strict()
  .superRefine((library, ctx) => {
    if (new Set(library.projects.map((p) => p.id)).size !== library.projects.length)
      ctx.addIssue({ code: 'custom', message: 'ID robot bị trùng.' });
    if (!library.projects.some((p) => p.id === library.activeId))
      ctx.addIssue({ code: 'custom', message: 'Robot đang mở không tồn tại.' });
  });
export type RobotLibrary = z.infer<typeof librarySchema>;
/** Start with Robot 02 while preserving all saved robot data. */
export function openDefaultRobot(library: RobotLibrary): RobotLibrary {
  const personal =
    library.projects.find(
      (p) => p.id === 'personal-robot-02' && p.design?.profile === 'personal-v1',
    ) ?? library.projects.find((p) => p.design?.profile === 'personal-v1');
  if (!personal) return library;
  return {
    ...library,
    activeId: personal.id,
    projects: [personal, ...library.projects.filter((p) => p.id !== personal.id)],
  };
}
export function initialLibrary(project = createSampleProject()): RobotLibrary {
  return { version: 1, activeId: project.id, projects: [project] };
}
/** Add the bundled personal design to older/browser-local libraries without replacing user work. */
function includePersonalRobot(library: RobotLibrary): RobotLibrary {
  if (
    library.projects.some((p) => p.design?.profile === 'personal-v1') ||
    library.projects.length >= 100
  )
    return library;
  const personal = createPersonalRobot();
  const ids = new Set(library.projects.map((p) => p.id));
  const names = new Set(library.projects.map((p) => p.name));
  const baseId = personal.id;
  for (let suffix = 2; ids.has(personal.id); suffix++) personal.id = `${baseId}-${suffix}`;
  if (names.has(personal.name)) {
    const baseName = 'Robot 02 · Note 9';
    personal.name = baseName;
    for (let suffix = 2; names.has(personal.name); suffix++)
      personal.name = `${baseName} (${suffix})`;
  }
  return { ...library, projects: [...library.projects, personal] };
}
export function loadLibrary(storage: Pick<Storage, 'getItem'> = localStorage): RobotLibrary {
  const raw = storage.getItem(LIBRARY_KEY);
  if (raw !== null) {
    try {
      return includePersonalRobot(librarySchema.parse(JSON.parse(raw)));
    } catch {
      throw new Error('Danh sách robot đã lưu không hợp lệ. Bản lưu được giữ nguyên.');
    }
  }
  // Migration is non-destructive: the legacy storage key is retained as a backup.
  return includePersonalRobot(initialLibrary(loadProject(storage) ?? createSampleProject()));
}
export function saveLibrary(
  library: RobotLibrary,
  storage: Pick<Storage, 'setItem' | 'getItem'> = localStorage,
  expectedRaw?: string | null,
) {
  if (expectedRaw !== undefined && storage.getItem(LIBRARY_KEY) !== expectedRaw)
    throw new Error(
      'Danh sách robot đã thay đổi ở tab khác. Hãy tải JSON để giữ thay đổi tại đây, rồi tải lại trang.',
    );
  const raw = JSON.stringify(librarySchema.parse(library));
  storage.setItem(LIBRARY_KEY, raw);
  return raw;
}
export function updateActiveRobot(
  library: RobotLibrary,
  edit: (p: RobotProject) => RobotProject,
): RobotLibrary {
  return {
    ...library,
    projects: library.projects.map((p) =>
      p.id === library.activeId ? { ...edit(p), id: p.id } : p,
    ),
  };
}
export function addRobot(library: RobotLibrary, source: RobotProject, name: string): RobotLibrary {
  if (library.projects.length >= 100) throw new Error('Đã đạt giới hạn 100 robot.');
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new Error('Tên robot cần từ 1 đến 80 ký tự.');
  const project = structuredClone(source);
  project.id = `robot-${crypto.randomUUID()}`;
  project.name = trimmed;
  project.updatedAt = new Date().toISOString();
  return { ...library, activeId: project.id, projects: [...library.projects, project] };
}
export function switchRobot(library: RobotLibrary, id: string): RobotLibrary {
  if (!library.projects.some((p) => p.id === id)) throw new Error('Không tìm thấy robot.');
  return { ...library, activeId: id };
}
export function applyPersonalDesign(library: RobotLibrary): RobotLibrary {
  return updateActiveRobot(library, (p) => ({ ...createPersonalRobot(), id: p.id, name: p.name }));
}

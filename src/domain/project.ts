import { projectSchema, type RobotProject, type PartInstance } from './schema';
export const STORAGE_KEY = 'robot-studio.project.v1';
export function parseProject(input: string): RobotProject {
  if (input.length > 5_000_000) throw new Error('Tệp vượt quá giới hạn 5 MB.');
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    throw new Error('Tệp không phải JSON hợp lệ. Dự án hiện tại được giữ nguyên.');
  }
  const result = projectSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((i) => {
        const reason =
          i.code === 'custom'
            ? i.message
            : i.code === 'invalid_literal'
              ? 'Phiên bản không được hỗ trợ (cần schemaVersion 1)'
              : i.code === 'invalid_type'
                ? i.received === 'undefined'
                  ? 'Thiếu trường bắt buộc'
                  : 'Sai kiểu dữ liệu'
                : i.code === 'too_small'
                  ? 'Giá trị nhỏ hơn giới hạn cho phép'
                  : i.code === 'too_big'
                    ? 'Giá trị vượt giới hạn cho phép'
                    : i.code === 'unrecognized_keys'
                      ? 'Có trường không thuộc schema'
                      : 'Giá trị không hợp lệ';
        return `${i.path.join('.') || 'dự án'}: ${reason}`;
      })
      .join('; ');
    throw new Error(`Dữ liệu dự án không hợp lệ: ${details}. Dự án hiện tại được giữ nguyên.`);
  }
  return result.data;
}
export function serializeProject(project: RobotProject): string {
  return JSON.stringify(projectSchema.parse(project), null, 2);
}
export function saveProject(
  project: RobotProject,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  storage.setItem(STORAGE_KEY, serializeProject(project));
}
export function loadProject(storage: Pick<Storage, 'getItem'> = localStorage): RobotProject | null {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? parseProject(raw) : null;
}
/** Scene units are metres; source data is always millimetres. Never mutate assembly coordinates. */
export function displayPosition(instance: PartInstance, percent: number): [number, number, number] {
  const amount = Math.max(0, Math.min(100, percent)) / 100;
  const length = Math.hypot(...instance.explodeDirection) || 1;
  return instance.positionMm.map(
    (n, i) =>
      (n + (instance.explodeDirection[i] / length) * instance.explodeDistanceMm * amount) / 1000,
  ) as [number, number, number];
}
export function downloadFile(filename: string, contents: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

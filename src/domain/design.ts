import { Box3, Euler, Matrix4, Vector3 } from 'three';
import type { RobotProject } from './schema';
import type { CompatibilityResult } from './compatibility';

export function massSummary(project: RobotProject) {
  let knownG = 0,
    missing = 0;
  for (const part of project.instances) {
    const d = project.definitions.find((d) => d.id === part.definitionId)!;
    if (d.includedIn || d.placement === 'offboard' || d.placement === 'planned') continue;
    if (d.massG === null) missing++;
    else knownG += d.massG;
  }
  return { knownG, missing };
}
// Installed coordinates only: hiding and exploding do not alter the physical envelope.
export function modelEnvelopeLwh(project: RobotProject): [number, number, number] {
  const bounds = new Box3();
  for (const part of project.instances) {
    const d = project.definitions.find((d) => d.id === part.definitionId)!;
    if (d.geometry === 'accessory' || d.placement === 'offboard' || d.placement === 'planned')
      continue;
    const matrix = new Matrix4().makeRotationFromEuler(
      new Euler(...(part.rotationDeg.map((v) => (v * Math.PI) / 180) as [number, number, number])),
    );
    matrix.setPosition(...part.positionMm);
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          bounds.expandByPoint(
            new Vector3(
              (x * d.dimensionsMm[0]) / 2,
              (y * d.dimensionsMm[1]) / 2,
              (z * d.dimensionsMm[2]) / 2,
            ).applyMatrix4(matrix),
          );
        }
  }
  if (bounds.isEmpty()) return [0, 0, 0];
  const size = bounds.getSize(new Vector3());
  return [size.z, size.x, size.y].map((v) => Math.round(v * 10) / 10) as [number, number, number];
}
export function estimateRuntimeMinutes(currentA: number, usableFraction = 0.8) {
  if (
    !Number.isFinite(currentA) ||
    currentA <= 0 ||
    !Number.isFinite(usableFraction) ||
    usableFraction <= 0 ||
    usableFraction > 1
  )
    return null;
  return ((2.5 * usableFraction) / currentA) * 60;
}
export function personalDesignChecks(project: RobotProject): CompatibilityResult[] {
  if (!project.design) return [];
  const size = modelEnvelopeLwh(project),
    max = project.design.maxDimensionsLwhMm;
  const mass = massSummary(project);
  const make = (
    id: string,
    title: string,
    status: CompatibilityResult['status'],
    reason: string,
    instanceIds: string[],
  ): CompatibilityResult => ({
    id: `design-${id}`,
    rule: 'design',
    title,
    status,
    reason,
    instanceIds: instanceIds.filter((id) => project.instances.some((i) => i.id === id)),
  });
  return [
    make(
      'envelope',
      'Không gian lắp đặt · D × R × C',
      size.some((v, n) => v > max[n]) ? 'fail' : 'unknown',
      `Hộp bao mô hình khoảng ${size.join(' × ')} mm; giới hạn ${max.join(' × ')} mm. Tệp nêu khung dài 256 mm (vượt 250 mm), nhà cung cấp nêu bộ 190 × 170 × 120 mm. Mô hình dùng phương án nhà cung cấp; phải đo phiên bản đang có và lỗ gá trước khi chốt.`,
      ['frame', 'phone'],
    ),
    make(
      'mass',
      'Khối lượng toàn xe',
      mass.knownG > project.design.maxMassG ? 'fail' : 'unknown',
      `Đã có số liệu ${mass.knownG} g, còn ${mass.missing} chi tiết trên xe thiếu khối lượng. Kit ~500 g chỉ tính một lần, Note 9 201 g. Trần toàn xe ${project.design.maxMassG} g; phần chưa cân, gá và module mới chưa được bảo đảm nằm trong trần.`,
      ['kit', 'phone'],
    ),
    make(
      'margin',
      'Dự phòng dòng khi quay tại chỗ',
      'unknown',
      'Ước tính trong tệp: 2 × 0,4 A = 0,8 A mỗi bên, bằng định mức liên tục 0,8 A/kênh MKE-M17. Chưa có dự phòng theo ước tính này; thiếu dòng khởi động/kẹt trục và đo nhiệt. Cần đo rồi quyết định driver lớn hơn hoặc thêm kênh.',
      ['driver', 'motor-left-front', 'motor-right-front'],
    ),
    make(
      'protection',
      'Bảo vệ và phân phối nguồn',
      'unknown',
      'Chưa chọn bảo vệ 2S, cầu chì và giải pháp cấp logic khi VIN shield dưới 7V. Sạc USB hai ngăn là sạc ngoài cho cell rời. Tuyên bố 10C của cell không xác nhận dòng chịu của khay, dây hoặc giắc.',
      ['holder', 'pack-protection-1', 'logic-regulator-1'],
    ),
    make(
      'runtime',
      'Thời lượng sử dụng',
      'unknown',
      '2S vẫn là 2,5 Ah: với 80% dung lượng sử dụng và 1,2–1,8 A tại pin, mô hình cho khoảng 67–100 phút. Đây là ước tính, chưa gồm LiDAR/cụm hút, sụt áp và ngưỡng VIN. Pin Note 9 cần đo riêng.',
      ['holder', 'phone'],
    ),
    make(
      'autonomy',
      'SLAM, AI và quét / hút',
      'unknown',
      'Đã ghi nhận yêu cầu và vị trí phần cứng có sẵn. Chưa chọn LiDAR/odometry/cơ cấu làm sạch; chưa có ứng dụng Android hoặc firmware được kiểm chứng. Sonar trước không bao phủ điểm mù, vật cản thấp hay mép cầu thang.',
      ['sonar', 'lidar-1', 'brush-1', 'vacuum-1'],
    ),
    make(
      'camera',
      'Tầm nhìn sàn và giường',
      'unknown',
      'Gá hiện tại hướng camera xuống 35° để nhìn sàn. Cần điều chỉnh góc gá hoặc bổ sung cơ cấu đổi góc để nhìn người trên giường; chưa mô phỏng FOV hay che khuất camera.',
      ['phone', 'cradle'],
    ),
  ];
}

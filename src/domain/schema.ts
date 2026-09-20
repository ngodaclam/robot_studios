import { z } from 'zod';
import { expressionIds } from './expressions';

const finite = z.number().finite();
const positive = finite.positive().max(1e9);
const nonnegative = finite.nonnegative().max(1e12);
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().min(1).max(1000);
export const vec3 = z.tuple([finite, finite, finite]);
const range = z
  .tuple([nonnegative, nonnegative])
  .refine(([a, b]) => a <= b, 'Dải giá trị phải tăng dần');
export const portSchema = z
  .object({
    id,
    name: text,
    kind: z.enum(['power', 'logic', 'mechanical']),
    direction: z.enum(['in', 'out']),
    required: z.boolean().default(false),
    voltageV: range.optional(),
    currentA: nonnegative.optional(),
    perChannelCurrentA: nonnegative.optional(),
    diameterMm: positive.optional(),
    channels: positive.int().optional(),
  })
  .strict();
export const definitionSchema = z
  .object({
    id,
    name: text,
    category: text,
    description: text,
    sku: text,
    manufacturer: z.string().max(200).nullable(),
    dimensionsMm: z.tuple([positive, positive, positive]),
    massG: nonnegative.nullable(),
    dimensionBasis: z.enum(['supplier', 'user', 'estimate']).optional(),
    placement: z.enum(['robot', 'offboard', 'planned']).optional(),
    includedIn: z.object({ definitionId: id, quantity: positive.int() }).strict().optional(),
    priceVnd: nonnegative.nullable(),
    source: text,
    verification: z.enum(['illustrative', 'unverified', 'verified']),
    geometry: z.enum([
      'base',
      'deck',
      'post',
      'motor',
      'wheel',
      'caster',
      'battery',
      'holder',
      'controller',
      'driver',
      'converter',
      'camera',
      'cameraMount',
      'sensor',
      'sensorMount',
      'switch',
      'motorMount',
      'accessory',
      'chassis4wd',
      'ttMotor',
      'phone',
      'phoneMount',
      'cell',
    ]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    specs: z.record(z.string().max(200)),
    ports: z.array(portSchema).max(30),
  })
  .strict();
export const instanceSchema = z
  .object({
    id,
    definitionId: id,
    assemblyId: id,
    name: text,
    positionMm: vec3,
    rotationDeg: vec3,
    explodeDirection: vec3,
    explodeDistanceMm: nonnegative.max(2000),
    visible: z.boolean(),
  })
  .strict();
const projectBase = z
  .object({
    schemaVersion: z.literal(1),
    id,
    name: z.string().trim().min(1).max(80),
    description: z.string().max(2000),
    updatedAt: z.string().datetime(),
    design: z
      .object({
        profile: z.literal('personal-v1'),
        sourceDocument: text,
        face: z
          .object({ expression: z.enum(expressionIds), auto: z.boolean() })
          .strict()
          .optional(),
        maxDimensionsLwhMm: z.tuple([positive, positive, positive]),
        maxMassG: positive,
        runtimeMin: range,
        budgetVnd: range,
        tests: z
          .array(
            z
              .object({
                id,
                title: text,
                criterion: text,
                status: z.enum(['untested', 'pass', 'fail']),
                notes: z.string().max(2000),
                testedOn: z.string().max(10),
              })
              .strict(),
          )
          .max(50),
      })
      .strict()
      .optional(),
    definitions: z.array(definitionSchema).min(1).max(500),
    instances: z.array(instanceSchema).min(1).max(2000),
    assemblies: z
      .array(z.object({ id, name: text, description: text, visible: z.boolean() }).strict())
      .min(1)
      .max(100),
    connections: z
      .array(
        z
          .object({
            id,
            kind: z.enum(['power', 'logic', 'mechanical']),
            channel: id.optional(),
            from: z.object({ instanceId: id, portId: id }).strict(),
            to: z.object({ instanceId: id, portId: id }).strict(),
          })
          .strict(),
      )
      .max(2000),
    inventory: z.record(id, nonnegative.int().max(1e6)),
    priceOverrides: z.record(id, nonnegative.nullable()),
  })
  .strict();
export const projectSchema = projectBase.superRefine((p, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  for (const [label, items] of [
    ['linh kiện', p.definitions],
    ['chi tiết', p.instances],
    ['cụm', p.assemblies],
    ['kết nối', p.connections],
  ] as const) {
    if (new Set(items.map((x) => x.id)).size !== items.length) issue(`ID ${label} bị trùng`);
  }
  const defs = new Map(p.definitions.map((d) => [d.id, d]));
  const parts = new Map(p.instances.map((i) => [i.id, i]));
  for (const d of p.definitions) {
    if (new Set(d.ports.map((x) => x.id)).size !== d.ports.length) issue(`Trùng cổng: ${d.name}`);
    if (
      d.includedIn &&
      (!defs.has(d.includedIn.definitionId) ||
        d.includedIn.definitionId === d.id ||
        defs.get(d.includedIn.definitionId)?.includedIn)
    )
      issue(`Bộ kit không hợp lệ: ${d.name}`);
  }
  for (const i of p.instances) {
    if (!defs.has(i.definitionId)) issue(`Chi tiết ${i.id} tham chiếu linh kiện không tồn tại`);
    if (!p.assemblies.some((a) => a.id === i.assemblyId))
      issue(`Chi tiết ${i.id} tham chiếu cụm không tồn tại`);
    if (i.positionMm.some((n) => Math.abs(n) > 10000))
      issue(`Vị trí ${i.id} vượt giới hạn 10.000 mm`);
  }
  for (const d of p.definitions.filter((d) => d.includedIn)) {
    const parent = d.includedIn!;
    const kitCount = p.instances.filter((i) => i.definitionId === parent.definitionId).length;
    if (p.instances.filter((i) => i.definitionId === d.id).length > kitCount * parent.quantity)
      issue(
        `Số chi tiết vượt nội dung bộ kit: ${d.name}. Tạo mục linh kiện mua rời cho phần bổ sung.`,
      );
  }
  const targets = new Set<string>();
  for (const c of p.connections) {
    const from = defs
      .get(parts.get(c.from.instanceId)?.definitionId ?? '')
      ?.ports.find((p) => p.id === c.from.portId);
    const to = defs
      .get(parts.get(c.to.instanceId)?.definitionId ?? '')
      ?.ports.find((p) => p.id === c.to.portId);
    if (!from || !to) {
      issue(`Kết nối ${c.id}: chi tiết hoặc cổng không tồn tại`);
      continue;
    }
    if (
      from.direction !== 'out' ||
      to.direction !== 'in' ||
      from.kind !== c.kind ||
      to.kind !== c.kind
    )
      issue(`Kết nối ${c.id}: sai loại hoặc chiều cổng`);
    const target = `${c.to.instanceId}:${c.to.portId}`;
    if (targets.has(target)) issue(`Cổng đầu vào ${target} được nối nhiều lần`);
    targets.add(target);
  }
  for (const key of [...Object.keys(p.inventory), ...Object.keys(p.priceOverrides)])
    if (!defs.has(key)) issue(`BOM tham chiếu linh kiện không tồn tại: ${key}`);
});
export type PartDefinition = z.infer<typeof definitionSchema>;
export type PartInstance = z.infer<typeof instanceSchema>;
export type Port = z.infer<typeof portSchema>;
export type RobotProject = z.infer<typeof projectBase>;
export type Assembly = RobotProject['assemblies'][number];
export type Connection = RobotProject['connections'][number];

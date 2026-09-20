import { useEffect, useRef } from 'react';
import type { RobotProject } from './schema';
import { buildBom, summarizeBom } from './bom';
interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
}
/** Optional browser capability. No AI service, network call, or key is used. */
export function useWebMcp(project: RobotProject) {
  const latest = useRef(project);
  latest.current = project;
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_robot_bill_of_materials',
            title: 'Đọc danh sách vật tư',
            description: 'Đọc BOM và tổng chi phí hiện tại của Robot Studio. Không sửa dữ liệu.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Đầu vào phải là đối tượng rỗng.');
              const rows = buildBom(latest.current);
              return {
                projectName: latest.current.name,
                summary: summarizeBom(rows),
                rows: rows.map((r) => ({
                  sku: r.definition.sku,
                  name: r.definition.name,
                  required: r.required,
                  owned: r.owned,
                  buy: r.buy,
                  unitPriceVnd: r.unitPrice,
                  subtotalVnd: r.subtotal,
                  verification: r.definition.verification,
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Browsers without WebMCP retain the full UI. */
    }
    return () => lifecycle.abort();
  }, []);
}

import { useState } from 'react';
import { normalizeSearch as normalize } from '../domain/search';
import { Download, Search, ArrowUpRight, Package, CircleHelp } from 'lucide-react';
import type { RobotProject } from '../domain/schema';
import { buildBom, money, summarizeBom } from '../domain/bom';
import { NumberField } from './NumberField';
interface Props {
  project: RobotProject;
  onInventory: (id: string, v: number) => void;
  onPrice: (id: string, v: number | null) => void;
  onPick: (id: string) => void;
  onExport: () => void;
}
export function BomPanel({ project, onInventory, onPrice, onPick, onExport }: Props) {
  const [search, setSearch] = useState('');
  const [onlyBuy, setOnlyBuy] = useState(false);
  const rows = buildBom(project);
  const totals = summarizeBom(rows);
  const filtered = rows.filter(
    (r) =>
      (!onlyBuy || r.buy > 0) &&
      normalize(r.definition.name + ' ' + r.definition.sku).includes(normalize(search)),
  );
  return (
    <div className="data-panel">
      <div className="data-heading">
        <div>
          <span className="eyebrow">BILL OF MATERIALS</span>
          <h2>Danh sách vật tư</h2>
          <p>Tổng hợp tự động từ các chi tiết trong thiết kế.</p>
        </div>
        <button className="primary-button" onClick={onExport}>
          <Download size={16} />
          Xuất CSV
        </button>
      </div>
      <div className="bom-metrics">
        <div>
          <span>Chi phí cần mua đã biết</span>
          <strong>{money(totals.knownCost)}</strong>
          <small>Chưa bao gồm {totals.unknownPurchasePrices} mục cần mua chưa có giá</small>
        </div>
        <div>
          <span>Số lượng cần mua</span>
          <strong>
            {totals.buy}
            <em> / {totals.required}</em>
          </strong>
          <small>{rows.length} loại linh kiện trong thiết kế</small>
        </div>
        <div>
          <span>Cần bổ sung thông tin</span>
          <strong>
            {totals.unknownPrices}
            <em> mục chưa có giá</em>
          </strong>
          <small>{totals.unverified} loại chưa được xác minh</small>
        </div>
      </div>
      <div className="data-filters">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Tìm vật tư"
            placeholder="Tìm tên hoặc mã linh kiện…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} />
          Chỉ hiện món cần mua
        </label>
        <span className="result-count">{filtered.length} mục</span>
      </div>
      <div className="table-scroll">
        <table className="bom-table">
          <thead>
            <tr>
              <th>Linh kiện</th>
              <th>Cần</th>
              <th>Đã có</th>
              <th>Cần mua</th>
              <th>Đơn giá (VND)</th>
              <th>Thành tiền</th>
              <th>Xác minh</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.definition.id} data-testid={`bom-${r.definition.id}`}>
                <td>
                  <button className="bom-name" onClick={() => onPick(r.instanceIds[0])}>
                    <span className="bom-icon">
                      <Package size={18} />
                    </span>
                    <span>
                      <strong>{r.definition.name}</strong>
                      <small>
                        {r.definition.sku}
                        {r.definition.includedIn
                          ? ' · thuộc kit, không tính giá lặp'
                          : r.definition.placement === 'planned'
                            ? ' · đề xuất, chưa chọn mẫu'
                            : r.definition.placement === 'offboard'
                              ? ' · ngoài xe'
                              : ''}
                      </small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                </td>
                <td>{r.required}</td>
                <td>
                  {r.definition.includedIn ? (
                    <span title="Số lượng có trong các bộ kit đã sở hữu">
                      {r.owned} · trong kit
                    </span>
                  ) : (
                    <NumberField
                      label={`Đã có ${r.definition.name}`}
                      value={r.owned}
                      integer
                      max={1e6}
                      onCommit={(v) => onInventory(r.definition.id, v ?? 0)}
                    />
                  )}
                </td>
                <td>
                  <span className={r.buy ? 'buy-count' : 'owned-count'}>{r.buy}</span>
                </td>
                <td>
                  {r.definition.includedIn ? (
                    <span className="small-note">Trong giá kit</span>
                  ) : (
                    <NumberField
                      label={`Đơn giá ${r.definition.name}`}
                      nullable
                      value={r.unitPrice}
                      max={1e12}
                      onCommit={(v) => onPrice(r.definition.id, v)}
                    />
                  )}
                </td>
                <td className="subtotal">
                  {r.subtotal === null ? (
                    <span className="unknown-price">Chưa tính được</span>
                  ) : (
                    money(r.subtotal)
                  )}
                </td>
                <td>
                  <span className={`verification ${r.definition.verification}`}>
                    {r.definition.verification === 'illustrative'
                      ? 'Minh họa'
                      : r.definition.verification === 'verified'
                        ? 'Đã xác minh'
                        : 'Chưa xác minh'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty-state">
            <Package size={30} />
            <h3>Không có vật tư phù hợp</h3>
            <button
              onClick={() => {
                setSearch('');
                setOnlyBuy(false);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
      <div className="table-note">
        <CircleHelp size={17} />
        <p>
          Đơn giá trống nghĩa là chưa có giá. Số lượng đã có và giá được lưu tự động sau khi rời ô
          nhập. Dữ liệu minh họa chưa dùng để đặt mua.
        </p>
      </div>
    </div>
  );
}

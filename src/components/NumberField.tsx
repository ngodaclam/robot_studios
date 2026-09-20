import { useEffect, useState } from 'react';
interface Props {
  value: number | null;
  onCommit: (v: number | null) => void;
  label: string;
  nullable?: boolean;
  integer?: boolean;
  signed?: boolean;
  max?: number;
  placeholder?: string;
}
export function NumberField({
  value,
  onCommit,
  label,
  nullable = false,
  integer = false,
  signed = false,
  max = 1e9,
  placeholder,
}: Props) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [error, setError] = useState(false);
  useEffect(() => {
    setDraft(value === null ? '' : String(value));
    setError(false);
  }, [value]);
  function commit() {
    const v = draft.trim() === '' ? (nullable ? null : 0) : Number(draft);
    if (
      v !== null &&
      (!Number.isFinite(v) ||
        (!signed && v < 0) ||
        Math.abs(v) > max ||
        (integer && !Number.isInteger(v)))
    ) {
      setError(true);
      return;
    }
    setError(false);
    onCommit(v);
  }
  return (
    <span className="number-field">
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        min={signed ? -max : 0}
        max={max}
        step={integer ? 1 : 'any'}
        value={draft}
        aria-label={label}
        aria-invalid={error}
        placeholder={placeholder ?? (nullable ? 'Chưa có giá' : '0')}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(value === null ? '' : String(value));
            setError(false);
          }
        }}
      />
      {error && (
        <span className="field-error" role="alert">
          {signed ? 'Số không hợp lệ' : integer ? 'Nhập số nguyên ≥ 0' : 'Nhập số ≥ 0'} (tối đa{' '}
          {max})
        </span>
      )}
    </span>
  );
}

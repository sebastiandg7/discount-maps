'use client';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Visually hides the label (still announced). */
  hideLabel?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  hideLabel = false,
}: ToggleProps) {
  return (
    <label
      className={`inline-flex items-center gap-3 ${disabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-pill transition disabled:cursor-not-allowed ${
          checked ? 'bg-brand-500' : 'bg-line'
        } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
      {hideLabel ? null : <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}

"use client";

type Segment = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

type RequestSegmentedControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  segments: Segment[];
  helperText?: string;
  name?: string;
};

export function RequestSegmentedControl({
  label,
  value,
  onChange,
  segments,
  helperText,
  name
}: RequestSegmentedControlProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium text-slate-900">{label}</legend>
      {helperText ? <p className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => {
          const active = segment.value === value;

          return (
            <label
              key={segment.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                active ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"
              } ${segment.disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={segment.value}
                checked={active}
                disabled={segment.disabled}
                onChange={() => onChange(segment.value)}
                className="mt-1 h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="grid gap-1">
                <span className="text-sm font-medium text-slate-900">{segment.label}</span>
                {segment.description ? <span className="text-sm text-slate-600">{segment.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

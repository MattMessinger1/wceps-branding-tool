"use client";

type RequestCheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  name?: string;
};

export function RequestCheckboxField({
  label,
  checked,
  onChange,
  description,
  disabled,
  name
}: RequestCheckboxFieldProps) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="grid gap-1">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {description ? <span className="text-sm text-slate-600">{description}</span> : null}
      </span>
    </label>
  );
}

"use client";

import type { SelectHTMLAttributes } from "react";
import { RequestField } from "./RequestField";

type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

type RequestSelectProps = {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  helperText?: string;
  errorText?: string;
  required?: boolean;
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children">;

export function RequestSelect({
  label,
  htmlFor,
  value,
  onChange,
  options,
  helperText,
  errorText,
  required,
  placeholder,
  ...selectProps
}: RequestSelectProps) {
  return (
    <RequestField label={label} htmlFor={htmlFor} helperText={helperText} errorText={errorText} required={required}>
      <select
        id={htmlFor}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        {...selectProps}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </RequestField>
  );
}

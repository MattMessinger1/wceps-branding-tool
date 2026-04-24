"use client";

import type { TextareaHTMLAttributes } from "react";
import { RequestField } from "./RequestField";

type RequestTextareaProps = {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  rows?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "children">;

export function RequestTextarea({
  label,
  htmlFor,
  value,
  onChange,
  helperText,
  errorText,
  required,
  rows = 5,
  ...textareaProps
}: RequestTextareaProps) {
  return (
    <RequestField label={label} htmlFor={htmlFor} helperText={helperText} errorText={errorText} required={required}>
      <textarea
        id={htmlFor}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        {...textareaProps}
      />
    </RequestField>
  );
}

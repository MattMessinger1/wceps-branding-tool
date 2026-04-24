"use client";

import type { ReactNode } from "react";

type RequestFieldProps = {
  label: string;
  htmlFor: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  children: ReactNode;
};

export function RequestField({
  label,
  htmlFor,
  helperText,
  errorText,
  required,
  children
}: RequestFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      {children}
      {helperText ? <p className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
      {errorText ? <p className="text-xs font-medium text-rose-600">{errorText}</p> : null}
    </div>
  );
}

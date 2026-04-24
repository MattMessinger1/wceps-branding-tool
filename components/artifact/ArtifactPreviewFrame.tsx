import type { ReactNode } from "react";

type ArtifactPreviewFrameProps = {
  title: string;
  eyebrow?: string;
  note?: string;
  accent?: "teal" | "amber" | "rose" | "green";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const accentStyles: Record<NonNullable<ArtifactPreviewFrameProps["accent"]>, string> = {
  teal: "border-teal-200 bg-teal-50/70",
  amber: "border-amber-200 bg-amber-50/70",
  rose: "border-rose-200 bg-rose-50/70",
  green: "border-emerald-200 bg-emerald-50/70"
};

export function ArtifactPreviewFrame({
  title,
  eyebrow,
  note,
  accent = "teal",
  children,
  footer,
  className = ""
}: ArtifactPreviewFrameProps) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm ${accentStyles[accent]} ${className}`}
      aria-label={title}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-4 py-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
          <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
          {note ? <p className="mt-1 text-sm text-slate-600">{note}</p> : null}
        </div>
      </header>
      <div className="min-w-0 flex-1 p-4">{children}</div>
      {footer ? <footer className="border-t border-slate-200/80 px-4 py-3">{footer}</footer> : null}
    </section>
  );
}

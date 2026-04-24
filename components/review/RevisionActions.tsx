"use client";

type RevisionAction = {
  label: string;
  description?: string;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  onClick: () => void;
};

type RevisionActionsProps = {
  title?: string;
  actions: RevisionAction[];
};

const toneStyles: Record<NonNullable<RevisionAction["tone"]>, string> = {
  default: "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
  primary: "border-teal-600 bg-teal-600 text-white hover:bg-teal-700",
  danger: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
};

export function RevisionActions({ title = "Revision actions", actions }: RevisionActionsProps) {
  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-sm font-medium transition ${toneStyles[action.tone ?? "default"]} ${
              action.disabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <span>{action.label}</span>
            {action.description ? <span className="text-xs font-normal leading-5 opacity-80">{action.description}</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

type ApprovalPanelProps = {
  title: string;
  status: "pending" | "approved" | "needs_changes" | "rejected";
  reviewerName?: string;
  reviewedAt?: string;
  summary?: string;
  notes?: string[];
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onReject?: () => void;
};

const statusStyles: Record<ApprovalPanelProps["status"], string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_changes: "border-amber-200 bg-amber-50 text-amber-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800"
};

export function ApprovalPanel({
  title,
  status,
  reviewerName,
  reviewedAt,
  summary,
  notes = [],
  onApprove,
  onRequestChanges,
  onReject
}: ApprovalPanelProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {summary ? <p className="mt-1 text-sm text-slate-600">{summary}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[status]}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {reviewerName ? (
          <div>
            <dt className="font-medium text-slate-900">Reviewer</dt>
            <dd>{reviewerName}</dd>
          </div>
        ) : null}
        {reviewedAt ? (
          <div>
            <dt className="font-medium text-slate-900">Reviewed</dt>
            <dd>{reviewedAt}</dd>
          </div>
        ) : null}
      </dl>

      {notes.length ? (
        <ul className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {notes.map((note) => (
            <li key={note} className="leading-6">
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {onApprove ? (
          <button
            type="button"
            onClick={onApprove}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Approve
          </button>
        ) : null}
        {onRequestChanges ? (
          <button
            type="button"
            onClick={onRequestChanges}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Request changes
          </button>
        ) : null}
        {onReject ? (
          <button
            type="button"
            onClick={onReject}
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
          >
            Reject
          </button>
        ) : null}
      </div>
    </section>
  );
}

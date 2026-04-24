import type { ReviewState } from "@/lib/schema/reviewState";

const styles: Record<ReviewState["status"], string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  block: "border-rose-200 bg-rose-50 text-rose-900",
};

export function BrandCheckPanel({ review }: { review: ReviewState }) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Brand and claims check</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[review.status]}`}>
          {review.status}
        </span>
      </div>

      {review.issues.length ? (
        <div className="grid gap-2">
          <h4 className="text-sm font-semibold text-rose-900">Blocking issues</h4>
          <ul className="grid gap-2 text-sm leading-6 text-rose-800">
            {review.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.warnings.length ? (
        <div className="grid gap-2">
          <h4 className="text-sm font-semibold text-amber-900">Warnings</h4>
          <ul className="grid gap-2 text-sm leading-6 text-amber-800">
            {review.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!review.issues.length && !review.warnings.length ? (
        <p className="text-sm leading-6 text-slate-600">No blocking issues or warnings were detected by the local guard.</p>
      ) : null}

      {review.suggestedFixes.length ? (
        <div className="grid gap-2 rounded-md bg-slate-50 p-3">
          <h4 className="text-sm font-semibold text-slate-900">Suggested fixes</h4>
          <ul className="grid gap-2 text-sm leading-6 text-slate-700">
            {review.suggestedFixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

# WCEPS Branding Tool

Internal MVP for generating source-grounded WCEPS marketing artifacts for:

- CARE Coaching
- WebbAlign
- CALL
- WCEPS parent-brand pathway materials

The tool combines editable brand packs, deterministic generation, a claims guard, review approval, and exportable HTML/React/copy/prompt-pack outputs.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional local env:

```bash
cp .env.local.example .env.local
```

The MVP does not require paid model or image-generation keys for copy, briefs, guardrails, or prompt packs.

To enable real OpenAI image generation, use the guided setup:

```bash
npm run setup:openai
```

The script asks for your API key without echoing it, lets you pick image size and quality, writes `.env.local`, and preserves unrelated environment variables. Restart `npm run dev` after changing `.env.local`.

To enable Braintrust tracing and quality evals, add these server-side variables to `.env.local` and to Vercel Preview/Production:

```bash
BRAINTRUST_API_KEY=...
BRAINTRUST_PROJECT_NAME="Brand Building"
BRAINTRUST_LOGGING_ENABLED=true
```

Do not prefix the Braintrust key with `NEXT_PUBLIC_`. Rotate any key that has been pasted into chat or screenshots.

## Core Workflow

1. Use `/create` to submit an artifact request.
2. The app resolves the brand, builds a creative brief, generates copy, creates image prompts, and runs the brand/claims guard.
3. Review the draft at `/review/[id]`.
4. Human approval is required before export.
5. Approved drafts can be exported from `/exports/[id]`.

## Supported Artifacts

- flyer
- one-pager
- social square
- landing page
- conference handout
- proposal cover
- email header
- HTML email announcement
- HTML email newsletter
- HTML email event invite

## Exports

Direct approved exports:

- PNG
- PDF
- HTML

Advanced exports include reusable React sections, copy-only briefs, and image prompt packs.

## Image Generation

`/api/generate-images` uses the OpenAI Image API when `OPENAI_API_KEY` is configured. It defaults to:

- model: `gpt-image-2`
- size: `1024x1024`
- quality: `auto`
- output format: `png`

Example:

```bash
curl -X POST http://localhost:3001/api/generate-images \
  -H "content-type: application/json" \
  -d '{"prompt":"Professional education-sector marketing visual for CARE Coaching, clean whitespace, no text in image."}'
```

## Source Ingestion

Run:

```bash
npm run ingest
```

This crawls WCEPS Pathways and linked program pages, then saves raw snapshots and normalized evidence under:

```text
data/raw/site-snapshots/
```

The hand-curated v1 brand packs live in:

```text
data/processed/brand-packs/
```

Validate packs:

```bash
npm run rebuild:brand-packs
```

## Sample Artifacts

Generate seeded demos:

```bash
npm run generate:samples
```

Seed requests live in:

```text
data/examples/sample-requests.json
```

## Quality Evals

Run local deterministic quality evals without sending logs:

```bash
npm run eval:local
```

Send the golden scenarios to Braintrust:

```bash
npm run eval:braintrust
```

The eval suite is named `Artifact QA Golden Scenarios` in the `Brand Building` project. It scores text overflow, CTA collisions, proof-line width, brand boundaries, single-logo usage, artifact format match, export readiness, and sendability.

## Brand Packs

Each brand pack includes:

- approved positioning
- audience guidance
- message pillars
- proof points
- approved phrases
- avoid phrases
- restricted claims
- artifact preferences
- source evidence

To add a new brand:

1. Copy an existing JSON file in `data/processed/brand-packs/`.
2. Update source evidence, audiences, approved phrases, avoid phrases, restricted claims, and visual style.
3. Run `npm run rebuild:brand-packs`.
4. Add selection terms in `lib/brands/selectBrand.ts`.

## Review And Approval

Export is blocked until:

- no blocking claims-guard issues exist
- a reviewer approves the artifact

The review page shows the preview, brief, image prompts, source evidence, warnings, and approval controls.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run eval:local
npm run eval:braintrust
npm run setup:openai
npm run ingest
npm run rebuild:brand-packs
npm run generate:samples
```

## Source Grounding

Primary source of truth:

- https://www.wcepspathways.org

Additional linked WCEPS program sites used for v1:

- https://www.webbalign.org
- https://www.leadershipforlearning.org

Do not add claims, metrics, guarantees, endorsements, pricing, or partnership statements unless they are present in source evidence and reviewed by a human.

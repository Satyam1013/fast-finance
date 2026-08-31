# Reference docs

Source of truth for scope. Requirement IDs (`FR-CUS-*`, `FR-PTR-*`, `FR-STF-*`,
`FR-ADM-*`, `NFR-*`) are cited throughout the codebase.

| File | What it is |
|---|---|
| `FastFinance-FRS-Internal.pdf` | Internal Functional & Technical Requirements Spec — data model (§9), business rules (§10.1), test plan (§12) |
| `FastFinance-PRD.pdf` | Product Requirement Document — profiles, journeys, feature list with P0/P1/P2, access control (§7) |

## ⚠️ Distribution

The FRS is marked **"Internal Use Only — Not for Client Distribution"** on every
page. The PDFs are git-ignored (`docs/*.pdf`) while this repository is public.

Once the repository is **private**, remove the `docs/*.pdf` line from
`.gitignore` and commit the PDFs so the whole team has them.

# FRC report packs

`report-pack.ts` creates server-side PDFs and `FRC_[Suburb]_[OrderID]_Report_Pack.zip`.

```text
00_READ_ME.pdf
01_Property_and_Boundary_Baseline.pdf
02_[Selected_Report].pdf
03_[Additional_Report].pdf
10_Concept_Visualisations/
  01_[type].svg (mock) or .jpg (live provider)
90_Source_Register.csv
91_Document_Register.csv
92_Risk_Register.csv
93_Action_Plan.pdf
94_Report_Manifest.json
95_Professional_Review_Record.pdf   (only when a reviewer record exists)
96_Council_Readiness_Checklist.pdf  (only when a Council-Readiness report is selected)
```

Each selected report gets a separate PDF on the shared evidence baseline. Only accepted or professionally approved visuals can be packed. In mock mode each accepted visualisation is rendered as a deterministic, labelled SVG (carrying its mandatory disclaimer and legend) so the concept-visualisation slot is never empty; a live image provider supplies raster bytes through `visualisationBytes`. `95_Professional_Review_Record.pdf` is written only after a registered professional's reviewer record exists, and `96_Council_Readiness_Checklist.pdf` only when a Council-Readiness report is in scope. The manifest records order/report IDs and names, template/pricing versions, generation date, review status, source/document/risk register versions, and every path, type, size and SHA-256 hash. It excludes credentials, tokens, private paths, payment data, prompts and internal notes.

Raw uploads are excluded by default. The endpoint refuses upload inclusion until a separate ownership confirmation and private-storage read exist. When enabled, authorisation and a clean malware result are mandatory. Third-party references are never copied; only their URLs/citations are included. Rejected visuals and raw provider responses are excluded.

PDF/ZIP endpoints validate the order or report token, require released status, return private no-store/no-sniff responses, sanitise paths, resolve duplicate names and audit downloads. Production should persist packs in R2 behind expiring signed links using `FRC_REPORT_PACK_EXPIRY_HOURS` (launch default 168 hours), with retention and large-archive streaming/load tests. The current small-pack renderer is in-memory and deliberately blocks raw-upload inclusion.

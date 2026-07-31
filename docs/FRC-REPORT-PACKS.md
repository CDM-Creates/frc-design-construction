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
95_Professional_Review_Record.pdf   (only after review)
96_Council_Readiness_Checklist.pdf  (only for Council Readiness)
Client_Uploads/                     (explicit opt-in only)
```

Each selected report receives a separate PDF based on its frozen template snapshot. Shared research does not cause every PDF to contain the same union of report-specific sections. The web report also offers a combined PDF and each individual report PDF.

Only accepted or professionally approved visuals can be packed. Mock mode renders deterministic labelled SVGs carrying the mandatory disclaimer and legend. A live provider must supply the actual authorised bytes; the pack builder will not silently substitute a mock image.

The manifest records order/report IDs and names, frozen template/pricing versions, generation date, review status, source/document/risk register versions, and every generated content path, type, size and SHA-256 hash. It intentionally does not hash itself; the returned manifest is byte-for-byte the JSON archived as `94_Report_Manifest.json`. It excludes credentials, tokens, private paths, payment data, prompts and internal notes.

Raw uploads are excluded by default. The secure report screen provides an unticked ownership-confirmation option. When selected, the endpoint re-authenticates the token, verifies recorded document-authority consent, reads authorised objects from private storage and includes only clean files. Quarantined, rejected, unavailable or unscanned files are excluded. Third-party references are never copied; only their source URLs/citations are included.

PDF/ZIP endpoints require a released report, return private `no-store`/`nosniff` responses, sanitise paths, resolve duplicate names and audit downloads. `FRC_REPORT_PACK_EXPIRY_HOURS` defaults to 168 hours. The current renderer is in-memory and intended for bounded report packs; large-archive load/streaming tests remain a production requirement.

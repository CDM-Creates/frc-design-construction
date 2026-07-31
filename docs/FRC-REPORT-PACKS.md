# FRC report packs

`report-pack.ts` creates server-side PDFs and `FRC_[Suburb]_[OrderID]_Report_Pack.zip`.

```text
00_READ_ME.pdf
01_Property_and_Boundary_Baseline.pdf
02_[Selected_Report].pdf
03_[Additional_Report].pdf
10_Concept_Visualisations/
90_Source_Register.csv
91_Document_Register.csv
92_Risk_Register.csv
93_Action_Plan.pdf
94_Report_Manifest.json
```

Each selected report gets a separate PDF on the shared evidence baseline. Only accepted or professionally approved visuals can be packed. The manifest records order/report IDs and names, template/pricing versions, generation date, review status, register versions, and every path, type, size and SHA-256 hash. It excludes credentials, tokens, private paths, payment data, prompts and internal notes.

Raw uploads are excluded by default. The endpoint refuses upload inclusion until a separate ownership confirmation and private-storage read exist. When enabled, authorisation and a clean malware result are mandatory. Third-party references are never copied; only their URLs/citations are included. Rejected visuals and raw provider responses are excluded.

PDF/ZIP endpoints validate the order or report token, require released status, return private no-store/no-sniff responses, sanitise paths, resolve duplicate names and audit downloads. Production should persist packs in R2 behind expiring signed links using `FRC_REPORT_PACK_EXPIRY_HOURS` (launch default 168 hours), with retention and large-archive streaming/load tests. The current small-pack renderer is in-memory and deliberately blocks raw-upload inclusion.

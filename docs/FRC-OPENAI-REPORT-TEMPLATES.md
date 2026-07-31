# FRC OpenAI report templates

Live report AI is disabled. The deterministic mock exercises the complete structured contract without credentials.

- Schema: `FRC_REPORT_SCHEMA_V2`
- Templates: `FRC_REPORT_TEMPLATES_2026_02`
- Prompts: `FRC_REPORT_PROMPTS_2026_02`
- Provider input: `FRC_REPORT_GENERATION_INPUT_V2`

`report-template-registry.ts` contains one complete fixed template per catalogue report. Multi-report generation can share one trusted evidence baseline, but each purchased report freezes its own template snapshot and is rendered as a separate PDF containing only that report’s required and conditional sections. Every section preserves its code and exact heading and can contain summary, findings, evidence, citations, limitations, risk, recommendations, actions and evidence-backed `extraSubsections`.

Every report contains the 25 common sections: cover; status; preliminary notice; client/decision context; property identity; property area/boundary; executive summary; scope; references/brief; documents; official/mapped sources; provenance; known facts; preliminary inferences; missing and conflicting information; opportunities; constraints; planning framework; risks; investigations; action plan; limitations; appendices; and references.

Report-specific modules cover lot/DP and environmental screening; development pathways and capacity; acquisition/options/staging; secondary dwelling motivation, access and services; additions and constructability; single/two-storey envelope and neighbour impact; pool safety and hydraulics; outdoor amenity; outbuilding access/separation; plan registers/matrices/conflicts; option comparisons; genuine professional review records; council readiness; and complex-scope triggers. Development reports add `concept_visualisations`.

## Evidence gate

The generation package is not created until the authenticated order contains a completed official NSW source scan. It includes:

- frozen template snapshots;
- official property facts and retrieval dates;
- source and provenance register;
- client context, motivation and supplied references;
- selected reports and frozen price metadata;
- purchased or report-included document-analysis categories;
- extracted document facts and explicit missing-information records.

A failed online lookup remains `lookup_failed`/unknown and is never converted to “no constraint”. Title, registered survey, Section 10.7 and unconnected council DCP information remain missing until supplied or ordered.

Separate prompts cover document extraction, reference interpretation, section drafting, fact/source validation, risks, actions and synthesis. They require supplied structured data only, property-fact citations, source-class distinctions, preserved sections, explicit unknowns/conflicts, conservative risk, Australian English and schema JSON. Basic uploads are registered, but only documents covered by an included or purchased analysis scope may produce relied-upon extracted facts.

Validation rejects wrong schema/template versions, altered frozen templates, duplicate/missing/misordered sections, changed headings, unsupported source IDs, missing official retrieval dates, evidence/status conflicts, inflated official status and unsupported non-preliminary extra subsections. It prohibits official certificates, guarantees, unsupported compliance, legal/engineering/survey certification, surveyed labels for mapped boundaries, confirmed inferred services and copied third-party designs.

To connect OpenAI, implement `ReportAiProvider`, preserve every structured field and run-metadata value, pass all validation/evals, then configure the server-side provider/model/key and enable flag. No key may enter a browser bundle.

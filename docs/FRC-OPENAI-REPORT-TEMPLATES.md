# FRC OpenAI report templates

Live report AI is disabled. The deterministic mock exercises the full structured contract without credentials.

- Schema: `FRC_REPORT_SCHEMA_V2`
- Templates: `FRC_REPORT_TEMPLATES_2026_02`
- Prompts: `FRC_REPORT_PROMPTS_2026_02`
- Provider input: `FRC_REPORT_GENERATION_INPUT_V1`

`report-template-registry.ts` contains one template per catalogue report. Multi-report orders union all mandatory modules. Every section preserves its code and can contain summary, findings, evidence, citations, limitations, risk, recommendations, actions and evidence-backed `extraSubsections`.

Every report contains the 25 common sections: cover; status; preliminary notice; client/decision context; property identity; property area/boundary; executive summary; scope; references/brief; documents; official/mapped sources; provenance; known facts; preliminary inferences; missing and conflicting information; opportunities; constraints; planning framework; risks; investigations; action plan; limitations; appendices; and references.

Report-specific modules cover lot/DP and environmental screening; development pathways and capacity; acquisition/options/staging; secondary dwelling motivation, access and services; additions and constructability; single/two-storey envelope and neighbour impact; pool safety and hydraulics; outdoor amenity; outbuilding access/separation; plan registers/matrices/conflicts; option comparisons; genuine professional review records; council readiness; and complex-scope triggers. Development reports add `concept_visualisations`.

Separate prompts cover document extraction, reference interpretation, section drafting, fact/source validation, risks, actions and synthesis. They require supplied structured data only, property-fact citations, source-class distinctions, preserved sections, explicit unknowns/conflicts, conservative risk, Australian English and schema JSON.

Validation rejects missing sections, unsupported source IDs, inflated official status and unsupported non-preliminary extra subsections. It prohibits official certificates, guarantees, unsupported compliance, legal/engineering/survey certification, surveyed labels for mapped boundaries, confirmed inferred services and copied third-party designs.

To connect OpenAI, implement `ReportAiProvider`, preserve all structured fields and run metadata, pass every validation/eval, then configure the server-side provider/model/key and enable flag. No key may enter a browser bundle.

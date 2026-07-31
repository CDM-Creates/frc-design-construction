# FRC architectural visualisations

The product term is **AI-assisted preliminary architectural concept visualisation**. Every visual includes: “Indicative concept visualisation only — not measured, approved or suitable for construction.”

Live generation is disabled. `MockArchitecturalVisualisationProvider` returns deterministic structured records and `UnconfiguredArchitecturalVisualisationProvider` fails closed.

## Boundary and schema

The server-only provider exposes concept, constraint, comparison and validation methods. Input is `FRC_ARCHITECTURAL_VISUALISATION_V1`; prompts are `FRC_ARCHITECTURAL_VISUAL_PROMPTS_2026_01`.

Input contains property/report/job references; customer and motivation; brief, references and authorised images; verified facts; parcel/boundary/area/north; existing and proposed building data; constraints; survey/title/easement evidence; services/stormwater; vegetation/hazards; privacy; review rules; required visual type/labels; and prohibited claims. Payment and unnecessary personal information are excluded.

Output stores IDs, type, provider/model/prompt, source inputs, private output reference, size/date, generation and review status, disclaimer, caption, purpose, legend, confidence, revision, validation issues, failure and next action.

## Types and input rules

Supported types are existing-site explanation, client-motivation concept, site opportunity, constraint overlay, services/plumbing, access/circulation, privacy/neighbour impact, options comparison and before/concept comparison.

Photos may record direction, approximate capture location, date, note and shown area. Site-specific before/after work requires a usable authorised property photo or reliable site model. Otherwise the provider must create a neutral diagram and cannot pretend to depict the property.

## Boundary, plumbing and service rules

Mapped parcels are always indicative. Without a survey, the registered-surveyor notice is mandatory and individual lengths cannot be invented.

Services use green for supported facts, amber for preliminary considerations, red for conflict/high-priority investigation and grey for unknowns. Unknown sewer, water or stormwater cannot be confirmed. Depth, invert, diameter, capacity, discharge point, mains, easements and approvals require evidence. Services visuals add “Indicative services concept — not for construction or excavation.”

## Validation, review and integration

Validation rejects missing disclaimers/captions, unsupported before/after work, surveyed labels without survey evidence, confirmed unknown services, wrong development type or missing motivation, and visuals attached to non-development reports.

Professional review is routed when purchased, for council readiness, material conflicts, site-specific conclusions, sensitive service/boundary interpretation or administrator escalation. Unfinished and rejected visuals are never released. Only accepted/approved image bytes and their hashes may enter `10_Concept_Visualisations/`.

Development reports explain motivation, direction, existing site, opportunity, constraints, services, access, privacy, alternatives and limitations as applicable. Every image requires title/caption, purpose, evidence used/unavailable, source legend, disclaimer and next action.

## Future OpenAI connection

Configure only after implementing the provider interface, private R2 writes, moderation, cost/time limits, redaction and validation:

```text
ARCHITECTURAL_IMAGE_PROVIDER=mock
ARCHITECTURAL_IMAGE_MODEL=
ARCHITECTURAL_IMAGE_API_KEY=
ARCHITECTURAL_IMAGE_ENABLED=false
```

The repository contains no live key or live adapter.

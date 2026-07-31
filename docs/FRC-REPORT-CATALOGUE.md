# FRC report catalogue

Catalogue `FRC_REPORT_CATALOGUE_2026_01`; pricing `FRC_REPORT_PRICING_2026_02`. Currency is AUD and all authoritative amounts are integer cents in `app/lib/report-platform/report-catalogue.ts`. Customer type personalises recommendations, terminology and report emphasis but never changes the same report price.

| Report | Launch price | Required input | Review |
| --- | ---: | --- | --- |
| Property Intelligence | A$695 | NSW property and decision context | Optional |
| Development Potential | A$995 | Property and development objective | Optional |
| Investor Options | A$1,495 | Options to compare | Optional |
| Granny Flat Feasibility | A$995 | URL, visual upload or written brief | Optional |
| Extension/Renovation Feasibility | A$995 | URL, visual upload or written brief | Optional |
| New Single-Storey Dwelling | A$1,295 | URL, visual upload or written brief | Optional |
| New Two-Storey Dwelling | A$1,495 | URL, visual upload or written brief | Optional |
| Pool and Spa | A$695 | URL, visual upload or written brief | Optional |
| Outdoor Living | A$695 | URL, visual upload or written brief | Optional |
| Garage or Outbuilding | A$795 | URL, visual upload or written brief | Optional |
| Architectural Plan Compliance | A$1,295 | Complete readable architectural plans | Optional |
| Detailed Options Comparison | A$1,495 | Two options and project motivation | Optional |
| FRC Professionally Reviewed | Minimum A$2,195 total | Base report and complete inputs | Included |
| Council Readiness | From A$3,500 | Complete plans and supporting evidence | Mandatory |
| Complex Development | Tailored from A$3,500 | Detailed brief and available evidence | Mandatory |

Each entry also declares template ID, intended customers, answered question, inclusions, exclusions, input/reference/drawing rules, outputs, limitations, combination rule, full price, shared credit and minimum contribution. Development reports include the property/planning baseline, area and boundary status, motivation, development analysis, concept visuals, constraints, services, sources, missing information, risks and actions. They exclude measured or construction drawings, engineering/survey certification, approval guarantees and copied third-party designs.

The first fixed-price report is full price. Eligible additional reports receive their configured shared-property research credit without reducing review minimums. Authoritative land-area tiers are: up to 1,000 m² included; 1,001–2,000 A$195; 2,001–5,000 A$395; 5,001–10,000 A$695; above 10,000, multiple adjoining parcels, rural/agricultural or unusual land requires quotation. Approximate, unavailable or conflicting area never creates an automatic surcharge.

The server recalculates selected reports plus site complexity and approved upgrades minus credits immediately before checkout, then stores an immutable hash-addressed snapshot. Browser and AI totals are ignored.

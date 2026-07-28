"use client";

import type { SiteCapacityResult } from "../lib/ai/contracts";

type SiteCapacityPanelProps = {
  capacity: SiteCapacityResult;
};

const sqm = (value?: number) =>
  value === undefined
    ? "Needs verified inputs"
    : `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(value)} m²`;

const statusTone = (status: SiteCapacityResult["status"]) => {
  if (status === "calculated_from_verified_inputs") {
    return "border-emerald-700/30 bg-emerald-50 text-emerald-900";
  }
  if (status === "insufficient_data") {
    return "border-amber-700/30 bg-amber-50 text-amber-950";
  }
  return "border-sky-700/30 bg-sky-50 text-sky-950";
};

const fitTone = (status: SiteCapacityResult["programme_fit"]["status"]) => {
  if (status === "comfortable") return "text-emerald-800";
  if (status === "efficient") return "text-amber-800";
  if (status === "constrained") return "text-red-800";
  return "text-slate-700";
};

export function SiteCapacityPanel({ capacity }: SiteCapacityPanelProps) {
  const envelope = capacity.envelope;
  const fit = capacity.programme_fit;

  return (
    <section className="space-y-8" aria-labelledby="site-capacity-heading">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-600">
            Deterministic property capacity calculator
          </p>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(capacity.status)}`}
          >
            {capacity.status_label}
          </span>
        </div>
        <h2
          id="site-capacity-heading"
          className="font-serif text-3xl font-normal text-slate-950"
        >
          How much house can this site reasonably support?
        </h2>
        <p className="max-w-3xl text-base leading-7 text-slate-700">
          The calculator combines the selected NSW parcel area with the planning
          controls already stored in the project. It then checks the client’s
          requested rooms against a practical household programme. It does not
          invent missing controls.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Land area used</p>
          <p className="mt-2 text-2xl font-medium text-slate-950">
            {sqm(capacity.site_area_sqm)}
          </p>
          <p className="mt-1 text-sm capitalize text-slate-500">
            Source: {capacity.area_source}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Maximum footprint</p>
          <p className="mt-2 text-2xl font-medium text-slate-950">
            {sqm(envelope.selected_footprint_cap_sqm)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Lowest available footprint control
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Preliminary maximum GFA</p>
          <p className="mt-2 text-2xl font-medium text-slate-950">
            {sqm(envelope.preliminary_max_gfa_sqm)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Arithmetic result, not an approval
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Recommended design target</p>
          <p className="mt-2 text-2xl font-medium text-slate-950">
            {sqm(envelope.recommended_design_gfa_sqm)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Includes a design-development buffer
          </p>
        </article>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-medium text-slate-950">
              Client brief fit
            </h3>
            <p className={`mt-2 text-xl font-medium capitalize ${fitTone(fit.status)}`}>
              {fit.status}
            </p>
            <p className="mt-3 leading-7 text-slate-700">{fit.explanation}</p>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Minimum programme</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {sqm(fit.minimum_gross_area_sqm)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Comfortable target</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {sqm(fit.target_gross_area_sqm)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Available design area</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {sqm(fit.available_design_area_sqm)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Target difference</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {fit.shortfall_or_surplus_sqm === undefined
                    ? "Unverified"
                    : `${fit.shortfall_or_surplus_sqm > 0 ? "+" : ""}${fit.shortfall_or_surplus_sqm} m²`}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-medium text-slate-950">
              Controls used
            </h3>
            <div className="mt-4 divide-y divide-slate-200">
              {capacity.controls.map((control) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-4 py-3"
                  key={control.label}
                >
                  <div>
                    <p className="font-medium text-slate-900">{control.label}</p>
                    <p className="text-sm text-slate-500">{control.planning_value.sourceName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">
                      {control.planning_value.value === null
                        ? "Missing"
                        : `${control.planning_value.value} ${control.planning_value.unit || ""}`}
                    </p>
                    <p className="text-sm capitalize text-slate-500">
                      {control.planning_value.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-slate-950">
                Practical room programme
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Suggested dimensions are concept targets, not construction
                dimensions.
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {capacity.room_programme.length} spaces assessed
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {capacity.room_programme.map((space) => (
              <article
                key={space.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-slate-950">
                      {space.room_name}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {space.floor} · {space.suggested_location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-950">
                      {space.recommended_width_m} m × {space.recommended_depth_m} m
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {space.fit_status?.replaceAll("_", " ") || "unverified"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {space.design_notes}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <h3 className="font-medium">What still needs professional verification</h3>
        <ul className="mt-3 grid gap-2 text-sm leading-6 md:grid-cols-2">
          {capacity.verification_required.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

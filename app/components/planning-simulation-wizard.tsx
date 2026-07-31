"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DOCUMENT_CATEGORIES,
} from "../lib/planning-simulation/document-categories";
import type {
  AssessmentMode,
  DocumentAnalysisUpgradeCode,
  DocumentCategoryCode,
  PlanningPricingInput,
  PlansStatus,
  PropertyConstraintPricingInput,
  SelectedDevelopmentItem,
} from "../lib/planning-simulation/types";
import {
  DocumentUploadPanel,
  type UploadedDocumentSummary,
} from "./document-upload-panel";
import {
  calculateCataloguePrice,
  CUSTOMER_TYPES,
  DECISION_OBJECTIVES,
  recommendationsFor,
  REPORT_BY_ID,
  REPORT_CATALOGUE,
  type CustomerTypeId,
  type DecisionObjectiveId,
} from "../lib/report-platform/report-catalogue";

const STORAGE_KEY = "frcPlanningReportPlatform";
const LEGACY_STORAGE_KEY = "frcPlanningSimulation";
const STEP_LABELS = ["Property", "Your context", "Reports", "Documents", "Source scan", "Price", "Review"];

const PLAN_OPTIONS: Array<{ value: PlansStatus; title: string; body: string }> = [
  { value: "none", title: "No plans exist", body: "Start with property and project-specific planning assessments." },
  { value: "frc_final", title: "Final FRC plans", body: "Client-approved FRC plans are available." },
  { value: "frc_in_progress", title: "FRC plans in progress", body: "FRC plans are still being developed or revised." },
  { value: "external_complete", title: "Complete external plans", body: "A complete, coordinated external drawing set is available." },
  { value: "external_incomplete", title: "Incomplete external plans", body: "Reconstruction or coordination requires a tailored engagement." },
  { value: "sheila_concept_required", title: "Architectural concept required", body: "Concept design is separately scoped by FRC." },
];

type PropertyAnalysis = {
  matchedAddress?: string;
  council?: string;
  lotDp?: string | null;
  mappedParcelAreaSqm?: number | null;
  controls?: {
    zone?: string;
    lep?: string;
    maxHeight?: string | null;
    fsr?: string | null;
    heritage?: string | null;
    bushfire?: string | null;
    flooding?: string | null;
  };
  planningFields?: Record<string, { status?: string }>;
  source?: { dataAttribution?: string; retrievedAt?: string };
};

type WizardState = {
  step: number;
  address: string;
  clientSuppliedLandAreaSqm: string;
  propertyCount: number;
  ownsProperty: boolean;
  customerType: CustomerTypeId | "";
  decisionObjective: DecisionObjectiveId | "";
  selectedReportIds: string[];
  openReportId: string;
  referenceUrl: string;
  referenceBrief: string;
  motivationSelections: string[];
  writtenMotivation: string;
  intendedUsers: string;
  smsConsent: boolean;
  selectedItems: SelectedDevelopmentItem[];
  assessmentMode: AssessmentMode;
  plansStatus: PlansStatus;
  professionalVerificationRequested: boolean;
  priorityRequested: boolean;
  councilSubmissionRequested: boolean;
  largeSiteAnalysisRequested: boolean;
  detailedAlternativesRequested: boolean;
  availableDocumentCategories: DocumentCategoryCode[];
  documentAnalysisUpgrades: DocumentAnalysisUpgradeCode[];
  uploadedDocuments: Partial<Record<DocumentCategoryCode, UploadedDocumentSummary[]>>;
  draftOrderId: string;
  draftAccessToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  consents: {
    preliminary_limitations: boolean;
    document_authority: boolean;
    secure_processing: boolean;
    professional_timeframe: boolean;
  };
  quoteAcknowledged: boolean;
  propertyAnalysis: PropertyAnalysis | null;
};

const INITIAL_STATE: WizardState = {
  step: 0,
  address: "",
  clientSuppliedLandAreaSqm: "",
  propertyCount: 1,
  ownsProperty: true,
  customerType: "",
  decisionObjective: "",
  selectedReportIds: [],
  openReportId: "",
  referenceUrl: "",
  referenceBrief: "",
  motivationSelections: [],
  writtenMotivation: "",
  intendedUsers: "",
  smsConsent: false,
  selectedItems: [],
  assessmentMode: "single",
  plansStatus: "none",
  professionalVerificationRequested: false,
  priorityRequested: false,
  councilSubmissionRequested: false,
  largeSiteAnalysisRequested: false,
  detailedAlternativesRequested: false,
  availableDocumentCategories: [],
  documentAnalysisUpgrades: [],
  uploadedDocuments: {},
  draftOrderId: "",
  draftAccessToken: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  notes: "",
  consents: {
    preliminary_limitations: false,
    document_authority: false,
    secure_processing: false,
    professional_timeframe: false,
  },
  quoteAcknowledged: false,
  propertyAnalysis: null,
};

const money = (cents: number) =>
  `A$${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(cents / 100)}`;

function pricingInputFor(state: WizardState, discoveredConstraints: PropertyConstraintPricingInput[]): PlanningPricingInput {
  return {
    propertyCount: state.propertyCount,
    selectedItemCodes: state.selectedItems.map((item) => item.code),
    clientRequestedLargeSiteAnalysis: state.largeSiteAnalysisRequested,
    plansStatus: state.plansStatus,
    documentAnalysisUpgrades: state.documentAnalysisUpgrades,
    detailedAlternativesRequested: state.detailedAlternativesRequested,
    councilSubmissionRequested: state.councilSubmissionRequested,
    professionalVerificationRequested: state.professionalVerificationRequested,
    priorityRequested: state.priorityRequested,
    discoveredConstraints,
    preliminaryOrVerified: state.propertyAnalysis ? "verified" : "preliminary",
  };
}

export function PlanningSimulationWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [propertyStatus, setPropertyStatus] = useState<"idle" | "loading" | "matched" | "error">("idle");
  const [propertyError, setPropertyError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<{ id: string; quote: boolean } | null>(null);
  const [busyUploads, setBusyUploads] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const draftPromise = useRef<Promise<{ orderId: string; accessToken: string }> | null>(null);

  const update = (patch: Partial<WizardState>) => setState((current) => ({ ...current, ...patch }));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<WizardState>;
        const storedOrderId = typeof stored.draftOrderId === "string" ? stored.draftOrderId : "";
        const sessionAccessToken = storedOrderId
          ? window.sessionStorage.getItem(`frcReportOrderAccess:${storedOrderId}`) ?? ""
          : "";
        const restored: WizardState = {
          ...INITIAL_STATE,
          ...stored,
          draftOrderId: sessionAccessToken ? storedOrderId : "",
          draftAccessToken: sessionAccessToken,
          step: Math.min(6, Math.max(0, Number(stored.step ?? 0))),
          availableDocumentCategories: Array.isArray(stored.availableDocumentCategories) ? stored.availableDocumentCategories : [],
          documentAnalysisUpgrades: Array.isArray(stored.documentAnalysisUpgrades) ? stored.documentAnalysisUpgrades : [],
          uploadedDocuments: sessionAccessToken ? stored.uploadedDocuments ?? {} : {},
          consents: { ...INITIAL_STATE.consents, ...(stored.consents ?? {}) },
          propertyAnalysis: stored.propertyAnalysis ?? null,
        };
        queueMicrotask(() => {
          setState(restored);
          if (stored.propertyAnalysis) setPropertyStatus("matched");
          setHydrated(true);
        });
        return;
      }
    } catch {
      // A corrupt or blocked local draft must not prevent the simulator opening.
    }
    queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const { draftAccessToken, ...persistableState } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
      if (state.draftOrderId && draftAccessToken) {
        window.sessionStorage.setItem(`frcReportOrderAccess:${state.draftOrderId}`, draftAccessToken);
      }
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [hydrated, state]);

  const discoveredConstraints = useMemo<PropertyConstraintPricingInput[]>(() => {
    const controls = state.propertyAnalysis?.controls;
    if (!controls) return [];
    const constraints: PropertyConstraintPricingInput[] = [];
    if (controls.heritage) constraints.push({ code: "HERITAGE", label: "Mapped heritage information", severity: "unknown", quoteTriggered: true, sourceStatus: "official" });
    if (controls.bushfire) constraints.push({ code: "BUSHFIRE", label: "Mapped bushfire-prone land", severity: "unknown", quoteTriggered: false, sourceStatus: "official" });
    if (controls.flooding) constraints.push({ code: "FLOOD", label: "Mapped flood planning information", severity: "unknown", quoteTriggered: false, sourceStatus: "official" });
    return constraints;
  }, [state.propertyAnalysis]);

  const pricingInput = useMemo(() => pricingInputFor(state, discoveredConstraints), [state, discoveredConstraints]);
  const cataloguePricing = (() => {
    if (!state.selectedReportIds.length || !state.customerType) return null;
    try {
      return calculateCataloguePrice({
        reportIds: state.selectedReportIds,
        customerType: state.customerType,
        site: {
          areaSqm: state.propertyAnalysis?.mappedParcelAreaSqm ?? (Number(state.clientSuppliedLandAreaSqm) || null),
          areaStatus: state.propertyAnalysis?.mappedParcelAreaSqm ? "official_parcel_mapped" : Number(state.clientSuppliedLandAreaSqm) ? "client_supplied" : "unavailable",
          parcelCount: state.propertyCount,
          ruralOrNonStandard: false,
        },
        professionalReviewRequested: state.professionalVerificationRequested,
        priorityReviewRequested: state.priorityRequested,
      });
    } catch {
      return null;
    }
  })();

  const setStep = (step: number) => {
    update({ step });
    setValidationError("");
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const ensureDraft = async () => {
    if (state.draftOrderId && state.draftAccessToken) return { orderId: state.draftOrderId, accessToken: state.draftAccessToken };
    draftPromise.current ??= fetch("/api/planning-simulation/orders/draft", { method: "POST" })
      .then(async (response) => {
        const result = await response.json() as { orderId?: string; accessToken?: string; error?: string };
        if (!response.ok || !result.orderId || !result.accessToken) throw new Error(result.error || "The secure upload draft could not be created.");
        window.sessionStorage.setItem(`frcReportOrderAccess:${result.orderId}`, result.accessToken);
        setState((current) => ({ ...current, draftOrderId: result.orderId!, draftAccessToken: result.accessToken! }));
        return { orderId: result.orderId, accessToken: result.accessToken };
      }).finally(() => { draftPromise.current = null; });
    return draftPromise.current;
  };

  const validateCurrentStep = () => {
    if (state.step === 0 && !state.address.trim()) return "Enter the full NSW property address to continue.";
    if (state.step === 1 && (!state.customerType || !state.decisionObjective)) return "Choose which customer type best describes you and what you are trying to understand.";
    if (state.step === 2 && !state.selectedReportIds.length) return "Select at least one complete report.";
    if (state.step === 2) {
      const requiresReference = state.selectedReportIds.some((id) => REPORT_BY_ID.get(id)?.referencesRequired);
      if (requiresReference && !state.referenceUrl.trim() && !state.referenceBrief.trim()) return "Provide a reference URL or written development brief for the selected development report.";
      const developmentSelected = state.selectedReportIds.some((id) => REPORT_BY_ID.get(id)?.developmentSpecific);
      if (developmentSelected && !state.writtenMotivation.trim() && !state.motivationSelections.length) return "Tell us what is motivating this project.";
    }
    if (state.step === 3) {
      if (busyUploads > 0) return "Wait for current document uploads to finish.";
      const awaiting = state.availableDocumentCategories.filter((code) => !(state.uploadedDocuments[code]?.length));
      if (awaiting.length) return "You marked this document as available. Upload at least one file or untick the document.";
    }
    if (state.step === 5 && cataloguePricing?.quoteRequired && !state.quoteAcknowledged) return "Confirm that you want to submit this scope for a tailored quotation.";
    return "";
  };

  const continueStep = () => {
    const error = validateCurrentStep();
    if (error) return setValidationError(error);
    setStep(Math.min(6, state.step + 1));
  };

  const checkProperty = async () => {
    if (!state.address.trim()) return setPropertyError("Enter the full NSW property address first.");
    setPropertyStatus("loading");
    setPropertyError("");
    try {
      const response = await fetch("/api/site-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: state.address, knownLandArea: Number(state.clientSuppliedLandAreaSqm) || undefined }),
      });
      const result = await response.json() as PropertyAnalysis & { error?: string };
      if (!response.ok) throw new Error(result.error || "The property could not be matched.");
      update({ propertyAnalysis: result });
      setPropertyStatus("matched");
    } catch (error) {
      update({ propertyAnalysis: null });
      setPropertyStatus("error");
      setPropertyError(error instanceof Error ? error.message : "Planning source temporarily unavailable.");
    }
  };

  const restart = () => {
    if (!window.confirm("Restart this simulation and clear the local draft? Uploaded test files remain in private test storage for audit and cleanup.")) return;
    if (state.draftOrderId) window.sessionStorage.removeItem(`frcReportOrderAccess:${state.draftOrderId}`);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setState(INITIAL_STATE);
    setSavedOrder(null);
    setPropertyStatus("idle");
    setPropertyError("");
    setValidationError("");
  };

  const confirmOrder = async () => {
    if (!state.customerType || !state.decisionObjective || !cataloguePricing) return;
    if (!state.clientName.trim() || !/^\S+@\S+\.\S+$/.test(state.clientEmail) || !state.clientPhone.trim()) {
      return setValidationError("Enter the client name, valid email and phone number.");
    }
    const required = ["preliminary_limitations", "document_authority", "secure_processing"] as const;
    const reviewRequired = state.professionalVerificationRequested || state.selectedReportIds.some((id) => ["professional_review", "council_readiness"].includes(id));
    if (required.some((code) => !state.consents[code]) || (reviewRequired && !state.consents.professional_timeframe)) {
      return setValidationError("Accept every required acknowledgement before continuing.");
    }
    const awaiting = state.availableDocumentCategories.filter((code) => !(state.uploadedDocuments[code]?.length));
    if (awaiting.length) return setValidationError("Every document marked available needs at least one successful upload.");
    setSaving(true);
    setValidationError("");
    try {
      const draft = await ensureDraft();
      const orderResponse = await fetch("/api/planning-simulation/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: draft.orderId,
          accessToken: draft.accessToken,
          client: {
            name: state.clientName,
            email: state.clientEmail,
            phone: state.clientPhone,
            role: state.customerType,
            customerType: state.customerType,
            decisionObjective: state.decisionObjective,
            smsConsent: state.smsConsent,
          },
          property: {
            clientSuppliedAddress: state.address,
            officialAddress: state.propertyAnalysis?.matchedAddress ?? null,
            lotDp: state.propertyAnalysis?.lotDp ?? null,
            council: state.propertyAnalysis?.council ?? null,
            mappedAreaSqm: state.propertyAnalysis?.mappedParcelAreaSqm ?? null,
            clientSuppliedAreaSqm: Number(state.clientSuppliedLandAreaSqm) || null,
            sourceStatus: state.propertyAnalysis ? "official_source_retrieved" : "not_verified",
            boundaryStatus: state.propertyAnalysis?.mappedParcelAreaSqm ? "official_parcel_mapped" : Number(state.clientSuppliedLandAreaSqm) ? "client_supplied" : "unavailable",
            parcelCount: state.propertyCount,
          },
          selectedReportIds: state.selectedReportIds,
          selectedItems: state.selectedItems,
          pricingInput,
          assessmentMode: state.selectedItems.length === 1 ? "single" : state.assessmentMode,
          availableDocumentCategories: state.availableDocumentCategories,
          notes: state.notes,
          professionalReviewRequested: state.professionalVerificationRequested,
          priorityReviewRequested: state.priorityRequested,
          projectMotivation: {
            selections: state.motivationSelections,
            writtenMotivation: state.writtenMotivation,
            intendedUsers: state.intendedUsers,
          },
          referenceMaterials: state.selectedReportIds.filter((id) => REPORT_BY_ID.get(id)?.referencesRequired).map((reportId) => ({
            reportId,
            url: state.referenceUrl,
            writtenBrief: state.referenceBrief,
          })),
          consents: state.consents,
        }),
      });
      const orderResult = await orderResponse.json() as { order?: { id: string }; checkoutAvailable?: boolean; error?: string };
      if (!orderResponse.ok || !orderResult.order) throw new Error(orderResult.error || "The order could not be confirmed.");
      window.sessionStorage.setItem(`frcReportOrderAccess:${draft.orderId}`, draft.accessToken);
      if (!orderResult.checkoutAvailable) {
        setSavedOrder({ id: orderResult.order.id, quote: true });
        return;
      }
      const checkoutResponse = await fetch(`/api/planning-simulation/orders/${draft.orderId}/checkout`, {
        method: "POST",
        headers: { "X-FRC-Order-Token": draft.accessToken },
      });
      const checkout = await checkoutResponse.json() as { session?: { checkoutUrl: string }; error?: string };
      if (!checkoutResponse.ok || !checkout.session) throw new Error(checkout.error || "The mock checkout could not be created.");
      window.location.assign(checkout.session.checkoutUrl);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "The order could not be confirmed.");
    } finally {
      setSaving(false);
    }
  };

  const renderPropertyStep = () => (
    <section className="planning-step" aria-labelledby="property-step-title">
      <header><span>01 · Property</span><h2 id="property-step-title">Planning intelligence before you commit to full documentation.</h2><p>Start with one NSW property. Official mapping remains separate from client-supplied information.</p></header>
      <div className="planning-fields">
        <label className="wide"><span>Full NSW property address</span><input value={state.address} onChange={(event) => update({ address: event.target.value, propertyAnalysis: null })} placeholder="61A Wills Road, Macarthur NSW 2560" autoComplete="street-address" /></label>
        <label><span>Approximate land area (optional)</span><div className="planning-unit"><input inputMode="decimal" value={state.clientSuppliedLandAreaSqm} onChange={(event) => update({ clientSuppliedLandAreaSqm: event.target.value })} placeholder="550" /><b>m²</b></div><small>Recorded as client supplied, not official or surveyed.</small></label>
        <label><span>Number of properties</span><select value={state.propertyCount} onChange={(event) => update({ propertyCount: Number(event.target.value), quoteAcknowledged: false })}><option value={1}>One property</option><option value={2}>Several properties or adjoining lots</option></select><small>Several properties require a tailored engagement.</small></label>
      </div>
      <label className="planning-inline-check"><input type="checkbox" checked={state.ownsProperty} onChange={(event) => update({ ownsProperty: event.target.checked })} /><span>I currently own this property</span></label>
      <button type="button" className="planning-secondary-action" onClick={checkProperty} disabled={propertyStatus === "loading"}>{propertyStatus === "loading" ? "Checking official NSW sources…" : "Check this NSW property"} <span>↗</span></button>
      {state.propertyAnalysis && <article className="property-match-card"><div><span>Official source retrieved</span><strong>{state.propertyAnalysis.matchedAddress ?? state.address}</strong></div><dl><div><dt>Council</dt><dd>{state.propertyAnalysis.council ?? "Not returned"}</dd></div><div><dt>Lot / DP</dt><dd>{state.propertyAnalysis.lotDp ?? "Not returned"}</dd></div><div><dt>Mapped area</dt><dd>{state.propertyAnalysis.mappedParcelAreaSqm ? `${state.propertyAnalysis.mappedParcelAreaSqm} m²` : "Not returned"}</dd></div></dl></article>}
      {propertyError && <div className="planning-alert error"><strong>Property check incomplete</strong><p>{propertyError}</p></div>}
    </section>
  );

  const renderPurposeStep = () => {
    const persona = state.customerType ? CUSTOMER_TYPES.find((customer) => customer.id === state.customerType) : null;
    return (
      <section className="planning-step" aria-labelledby="purpose-step-title">
        <header><span>02 · Your context</span><h2 id="purpose-step-title">Which best describes you?</h2><p>Your answer personalises terminology, recommendations and the action plan. It never changes the price of the same report.</p></header>
        <div className="planning-choice-grid two">{CUSTOMER_TYPES.map((customer) => <label className={`planning-choice ${state.customerType === customer.id ? "selected" : ""}`} key={customer.id}><input type="radio" name="customer-type" checked={state.customerType === customer.id} onChange={() => update({ customerType: customer.id })} /><span className="choice-check">✓</span><strong>{customer.label}</strong><small>{customer.emphasis.join(" · ")}</small></label>)}</div>
        {persona && <div className="planning-alert"><strong>{persona.headline}</strong><p>{persona.supportingCopy}</p></div>}
        <fieldset className="decision-objectives"><legend>What are you trying to understand?</legend>{DECISION_OBJECTIVES.map((objective) => <label key={objective.id}><input type="radio" name="decision-objective" checked={state.decisionObjective === objective.id} onChange={() => update({ decisionObjective: objective.id })} /><span>{objective.label}</span></label>)}</fieldset>
      </section>
    );
  };

  const renderItemsStep = () => {
    const recommendationMap = state.customerType && state.decisionObjective
      ? new Map(recommendationsFor(state.customerType, state.decisionObjective).map((item) => [item.reportId, item.status]))
      : new Map<string, "required" | "recommended" | "optional">();
    const selectedReports = state.selectedReportIds.map((id) => REPORT_BY_ID.get(id)).filter((entry) => entry !== undefined);
    const needsReference = selectedReports.some((report) => report.referencesRequired);
    const developmentSelected = selectedReports.some((report) => report.developmentSpecific);
    const motivations = ["Create space for parents or extended family", "Create independent accommodation", "Generate rental income", "Increase property value", "Prepare the property for sale", "Improve family lifestyle", "Add bedrooms", "Add working-from-home space", "Create accessible accommodation", "Build a long-term family home", "Improve outdoor living", "Add vehicle or storage space", "Compare investment options", "Replace an ageing dwelling", "Improve energy efficiency", "Prepare for future subdivision or redevelopment", "Other"];
    return (
      <section className="planning-step" aria-labelledby="items-step-title">
        <header><span>03 · Complete reports</span><h2 id="items-step-title">Choose the report that answers your question.</h2><p>Recommendations are guidance only. Every price is controlled by the server and shared property research is credited transparently when eligible reports are combined.</p></header>
        <div className="report-catalogue-grid">{REPORT_CATALOGUE.map((report) => {
          const selected = state.selectedReportIds.includes(report.id);
          const open = state.openReportId === report.id;
          const recommendation = recommendationMap.get(report.id) ?? "optional";
          return <article className={`report-catalogue-card ${selected ? "selected" : ""} ${recommendation}`} key={report.id}>
            <label><input type="checkbox" checked={selected} onChange={() => update({ selectedReportIds: selected ? state.selectedReportIds.filter((id) => id !== report.id) : [...state.selectedReportIds, report.id], quoteAcknowledged: false })} /><span><small>{recommendation === "required" ? "Required for selected service" : recommendation === "recommended" ? "Recommended" : "Optional"}</small><strong>{report.name}</strong><b>{report.priceCents !== null ? money(report.priceCents) : `From ${money(report.fromPriceCents ?? 0)}`}</b><p>{report.purpose}</p><em>Commonly suited to {report.suitedTo.slice(0, 3).map((id) => CUSTOMER_TYPES.find((customer) => customer.id === id)?.label).join(", ")}</em></span></label>
            <button type="button" className="report-info-button" aria-expanded={open} aria-controls={`report-info-${report.id}`} aria-label={`View inclusions for ${report.name}`} onClick={() => update({ openReportId: open ? "" : report.id })}>?</button>
            <div id={`report-info-${report.id}`} className="report-info-panel" hidden={!open}>
              <h3>Who this report is for</h3><p>{report.suitedTo.map((id) => CUSTOMER_TYPES.find((customer) => customer.id === id)?.label).join(", ")}</p>
              <h3>What question it answers</h3><p>{report.answers}</p>
              <h3>What it includes</h3><ul>{report.includes.map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>What it does not include</h3><ul>{report.excludes.map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>What you must provide</h3><ul>{report.requiredInputs.map((item) => <li key={item}>{item}</li>)}</ul>
              <dl><div><dt>References</dt><dd>{report.referencesRequired ? "Required" : "Not required"}</dd></div><div><dt>Drawings</dt><dd>{report.drawingsRequired ? "Required" : "Not required"}</dd></div><div><dt>Professional review</dt><dd>{report.professionalReview.replaceAll("_", " ")}</dd></div><div><dt>Expected files</dt><dd>{report.outputFiles.join(", ")}</dd></div></dl>
              <h3>Important limitations</h3>{report.limitations.map((item) => <p key={item}>{item}</p>)}{report.developmentSpecific && <p>Visualisations are preliminary and illustrative. They are not architectural, engineering, surveying or construction documentation.</p>}
            </div>
          </article>;
        })}</div>
        {developmentSelected && <div className="project-motivation-panel"><h3>What is motivating this project?</h3><div>{motivations.map((motivation) => <label key={motivation}><input type="checkbox" checked={state.motivationSelections.includes(motivation)} onChange={(event) => update({ motivationSelections: event.target.checked ? [...state.motivationSelections, motivation] : state.motivationSelections.filter((item) => item !== motivation) })} /><span>{motivation}</span></label>)}</div><label><span>Written project motivation</span><textarea value={state.writtenMotivation} onChange={(event) => update({ writtenMotivation: event.target.value })} /></label><label><span>Who will use the development?</span><input value={state.intendedUsers} onChange={(event) => update({ intendedUsers: event.target.value })} /></label></div>}
        {needsReference && <div className="reference-material-panel"><h3>Reference material or development brief</h3><p>Reference material helps FRC understand your intended outcome. It is not treated as an approved design, and third-party intellectual property is not reproduced.</p><label><span>Reference, supplier, project, prefab model or inspiration URL</span><input type="url" value={state.referenceUrl} onChange={(event) => update({ referenceUrl: event.target.value })} placeholder="https://…" /></label><label><span>Written development brief</span><textarea value={state.referenceBrief} onChange={(event) => update({ referenceBrief: event.target.value })} placeholder="Describe what you want to build, preferred features, approximate size and what matters most." /></label><small>Provide at least one URL, uploaded visual reference or written brief. Important references should also be uploaded as a screenshot or PDF because external pages can change.</small></div>}
      </section>
    );
  };

  const renderDocumentsStep = () => (
    <section className="planning-step" aria-labelledby="documents-step-title">
      <header><span>04 · Plans and documents</span><h2 id="documents-step-title">Use what you already have.</h2><p>Already have a survey, certificate or drawing set? Upload it once. We use it as evidence rather than asking you to recreate the same information.</p></header>
      <div className="planning-choice-grid two">{PLAN_OPTIONS.map((option) => <label className={`planning-choice ${state.plansStatus === option.value ? "selected" : ""}`} key={option.value}><input type="radio" name="plans-status" checked={state.plansStatus === option.value} onChange={() => update({ plansStatus: option.value, quoteAcknowledged: false })} /><span className="choice-check">✓</span><strong>{option.title}</strong><small>{option.body}</small></label>)}</div>
      <div className="document-checklist expanded">
        <header><span>Document availability and secure upload</span><p>Every checked row opens its own upload panel. A checked row without a successful upload blocks progress.</p></header>
        {DOCUMENT_CATEGORIES.map((document) => {
          const selected = state.availableDocumentCategories.includes(document.code);
          return <div className={`document-availability-row ${selected ? "selected" : ""}`} key={document.code}>
            <label><input type="checkbox" checked={selected} onChange={(event) => {
              const availableDocumentCategories = event.target.checked ? [...state.availableDocumentCategories, document.code] : state.availableDocumentCategories.filter((code) => code !== document.code);
              const documentAnalysisUpgrades = !event.target.checked && document.premiumUpgradeCode ? state.documentAnalysisUpgrades.filter((code) => code !== document.premiumUpgradeCode) : state.documentAnalysisUpgrades;
              update({ availableDocumentCategories, documentAnalysisUpgrades });
            }} /><span><strong>{document.label}</strong><small>{document.description}</small></span><b>{selected ? (state.uploadedDocuments[document.code]?.length ? `${state.uploadedDocuments[document.code]?.length} uploaded` : "Selected · awaiting upload") : "Not supplied"}</b></label>
            {selected && <DocumentUploadPanel
              category={document}
              documents={state.uploadedDocuments[document.code] ?? []}
              premiumSelected={Boolean(document.premiumUpgradeCode && state.documentAnalysisUpgrades.includes(document.premiumUpgradeCode))}
              onPremiumChange={(checked) => {
                if (!document.premiumUpgradeCode) return;
                update({ documentAnalysisUpgrades: checked ? [...new Set([...state.documentAnalysisUpgrades, document.premiumUpgradeCode])] : state.documentAnalysisUpgrades.filter((code) => code !== document.premiumUpgradeCode) });
              }}
              ensureDraft={ensureDraft}
              onUploaded={(uploaded) => setState((current) => ({ ...current, uploadedDocuments: { ...current.uploadedDocuments, [document.code]: [...(current.uploadedDocuments[document.code] ?? []), uploaded] } }))}
              onRemoved={(documentId) => setState((current) => ({ ...current, uploadedDocuments: { ...current.uploadedDocuments, [document.code]: (current.uploadedDocuments[document.code] ?? []).filter((item) => item.id !== documentId) } }))}
              onBusyChange={(busy) => setBusyUploads((current) => Math.max(0, current + (busy ? 1 : -1)))}
            />}
          </div>;
        })}
      </div>
    </section>
  );

  const renderSourceStep = () => {
    const fields = state.propertyAnalysis?.planningFields ?? {};
    const uploaded = (code: DocumentCategoryCode) => Boolean(state.uploadedDocuments[code]?.length);
    const rows = [
      ["Official address", state.propertyAnalysis ? "Retrieved" : "Not connected"],
      ["Lot and DP", state.propertyAnalysis?.lotDp ? "Retrieved" : "Not connected"],
      ["Indicative mapped area", state.propertyAnalysis?.mappedParcelAreaSqm ? "Retrieved" : "Not connected"],
      ["Council", state.propertyAnalysis?.council ? "Retrieved" : "Not connected"],
      ["Zoning", fields.zone?.status === "mapped" ? "Retrieved" : "Not connected"],
      ["LEP", state.propertyAnalysis?.controls?.lep ? "Retrieved" : "Requires professional review"],
      ["Building height", fields.height?.status === "mapped" ? "Retrieved" : "Requires professional review"],
      ["Floor-space ratio", fields.fsr?.status === "mapped" ? "Retrieved" : "Requires professional review"],
      ["Heritage screening", fields.heritage ? "Retrieved" : "Not connected"],
      ["Bushfire screening", fields.bushfire ? "Retrieved" : "Not connected"],
      ["Flood information", fields.flooding ? "Retrieved" : "Not connected"],
      ["Council DCP", "Requires professional review"],
      ["Title and deposited plan", uploaded("title_and_deposited_plan") ? "Uploaded" : "Not connected"],
      ["Registered survey", uploaded("registered_detail_survey") ? "Uploaded" : "Not connected"],
      ["Section 10.7 certificate", uploaded("section_10_7_certificate") ? "Uploaded" : "Requires ordering"],
    ];
    return <section className="planning-step" aria-labelledby="scan-step-title"><header><span>05 · Property information scan</span><h2 id="scan-step-title">See what is known — and what remains required.</h2><p>Unavailable information stays unverified. A failed lookup is never interpreted as “no constraint”.</p></header>{!state.propertyAnalysis && <div className="planning-alert"><strong>No completed official property match.</strong><p>Continue with a preliminary request or return to Property to retry the official NSW lookup.</p><button type="button" onClick={() => setStep(0)}>Return to property</button></div>}<div className="source-status-list">{rows.map(([label, status]) => <div key={label}><span>{label}</span><b className={status.toLowerCase().replaceAll(" ", "-")}>{status}</b></div>)}</div>{discoveredConstraints.length > 0 && <div className="planning-alert warning"><strong>Mapped constraint flags need review.</strong><p>{discoveredConstraints.map((item) => item.label).join(", ")}. Screening does not replace specialist assessment.</p></div>}<p className="source-footnote">Official result source: {state.propertyAnalysis?.source?.dataAttribution ?? "not connected"}. Uploaded statutory and consultant documents remain third-party evidence; FRC does not generate fake replacements.</p></section>;
  };

  const renderPriceStep = () => (
    <section className="planning-step" aria-labelledby="price-step-title">
      <header><span>06 · Price and report level</span><h2 id="price-step-title">One transparent server-controlled total.</h2><p>Selected reports, site-area complexity, review upgrades and shared-property research credits are shown separately. Your customer type never changes the price.</p></header>
      <div className={`full-price-card ${cataloguePricing?.quoteRequired ? "quote" : ""}`}>
        {!cataloguePricing ? <p>Select a customer type and at least one report to calculate the confirmed scope.</p> : cataloguePricing.quoteRequired ? <>
          <span>Tailored engagement — from A$3,500</span><h3>This is not a final payable price.</h3><ul>{cataloguePricing.quoteReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <label className="planning-inline-check"><input type="checkbox" checked={state.quoteAcknowledged} onChange={(event) => update({ quoteAcknowledged: event.target.checked })} /><span>Submit this confirmed scope for a tailored quotation.</span></label>
        </> : <><span>Current calculated price</span><dl>{cataloguePricing.lines.map((line) => <div key={line.code}><dt>{line.label}</dt><dd>{line.amountCents < 0 ? `−${money(Math.abs(line.amountCents))}` : money(line.amountCents)}</dd></div>)}<div className="total"><dt>Final total</dt><dd>{money(cataloguePricing.totalCents ?? 0)}</dd></div></dl><p className="price-tax-label">Test mode · GST configuration required before launch</p></>}
      </div>
      <div className="planning-upgrades">
        <label><input type="checkbox" checked={state.professionalVerificationRequested} onChange={(event) => update({ professionalVerificationRequested: event.target.checked, priorityRequested: event.target.checked ? state.priorityRequested : false })} /><span><strong>FRC professional verification</strong><small>+A$895 · minimum total engagement A$2,195</small></span></label>
        <label className={!state.professionalVerificationRequested ? "disabled" : ""}><input type="checkbox" disabled={!state.professionalVerificationRequested} checked={state.priorityRequested} onChange={(event) => update({ priorityRequested: event.target.checked })} /><span><strong>Priority professional review</strong><small>+A$450 · available only with professional verification</small></span></label>
      </div>
      <div className="package-anchors"><article><span>Transparent report pricing</span><p>No charge simply for uploading documents.</p></article><article><span>Shared research</span><p>Eligible additional reports receive their configured shared-property research credit.</p></article><article><span>Large sites</span><p>Authoritative area tiers add real whole-site analysis; uncertain area never creates an unsupported surcharge.</p></article></div>
    </section>
  );

  const renderReviewStep = () => (
    <section className="planning-step" aria-labelledby="review-step-title">
      <header><span>07 · Checkout review</span><h2 id="review-step-title">Review the scope before mock payment.</h2><p>Test mode creates a persistent order and exercises the full payment, report and status workflow without charging a card or calling a live AI provider.</p></header>
      <div className="planning-fields">
        <label><span>Client name</span><input value={state.clientName} onChange={(event) => update({ clientName: event.target.value })} autoComplete="name" /></label>
        <label><span>Email</span><input type="email" value={state.clientEmail} onChange={(event) => update({ clientEmail: event.target.value })} autoComplete="email" /></label>
        <label><span>Phone</span><input value={state.clientPhone} onChange={(event) => update({ clientPhone: event.target.value })} autoComplete="tel" /></label>
        <label className="planning-inline-check"><input type="checkbox" checked={state.smsConsent} onChange={(event) => update({ smsConsent: event.target.checked })} /><span>Send SMS report updates (optional)</span></label>
        <label className="wide"><span>Project notes (optional)</span><textarea value={state.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Objectives, timing, existing structures or other useful context." /></label>
      </div>
      <div className="checkout-review-card">
        <dl><div><dt>Property</dt><dd>{state.address}</dd></div><div><dt>Customer type</dt><dd>{CUSTOMER_TYPES.find((customer) => customer.id === state.customerType)?.label}</dd></div><div><dt>Reports</dt><dd>{state.selectedReportIds.map((id) => REPORT_BY_ID.get(id)?.name).join(", ")}</dd></div><div><dt>Uploaded documents</dt><dd>{Object.values(state.uploadedDocuments).flat().length} files across {state.availableDocumentCategories.length} selected categories</dd></div><div><dt>Final server total</dt><dd>{cataloguePricing?.quoteRequired ? "Tailored engagement" : money(cataloguePricing?.totalCents ?? 0)}</dd></div><div><dt>Tax</dt><dd>Confirmed by server configuration before live checkout</dd></div></dl>
      </div>
      <div className="legal-consents">
        <label><input type="checkbox" checked={state.consents.preliminary_limitations} onChange={(event) => update({ consents: { ...state.consents, preliminary_limitations: event.target.checked } })} /><span>I understand that an AI-only report is preliminary and does not constitute development approval, a registered survey, engineering certification, legal advice or council confirmation.</span></label>
        <label><input type="checkbox" checked={state.consents.document_authority} onChange={(event) => update({ consents: { ...state.consents, document_authority: event.target.checked } })} /><span>I confirm that the information and documents I supplied are accurate to the best of my knowledge and that I am authorised to upload them.</span></label>
        <label><input type="checkbox" checked={state.consents.secure_processing} onChange={(event) => update({ consents: { ...state.consents, secure_processing: event.target.checked } })} /><span>I consent to the secure processing of my submitted information and documents for the purpose of preparing this report.</span></label>
        {(state.professionalVerificationRequested || state.selectedReportIds.some((id) => ["professional_review", "council_readiness"].includes(id))) && <label><input type="checkbox" checked={state.consents.professional_timeframe} onChange={(event) => update({ consents: { ...state.consents, professional_timeframe: event.target.checked } })} /><span>I understand that the professional-review timeframe begins after payment and after all required information has been successfully received.</span></label>}
        <p><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/disclaimer">Report limitations</a> · Refund policy requires business confirmation</p>
      </div>
      {!savedOrder ? <button type="button" className="planning-primary-action" onClick={confirmOrder} disabled={saving || !cataloguePricing}>{saving ? "Freezing server price and creating order…" : cataloguePricing?.quoteRequired ? "Submit scope for tailored quotation" : "Continue to mock payment"} <span>→</span></button> : <div className="planning-success"><span>Tailored quotation requested</span><h3>Your scope has been stored for FRC review.</h3><p>Order {savedOrder.id}. No automatic checkout or final fee was created.</p></div>}
    </section>
  );

  const stepContent = [
    renderPropertyStep(),
    renderPurposeStep(),
    renderItemsStep(),
    renderDocumentsStep(),
    renderSourceStep(),
    renderPriceStep(),
    renderReviewStep(),
  ][state.step];

  return (
    <div className="planning-simulator" ref={topRef}>
      <section className="planning-hero">
        <div><span>FRC · Property planning simulation</span><h1>Planning intelligence <em>before you commit.</em></h1></div>
        <div><p>Select the development work you want assessed, upload the documents you already hold, and receive a structured preliminary report built from traceable property information.</p><small>Use what you already have. Pay only for the analysis and professional input included in your selected scope.</small></div>
      </section>
      <nav className="planning-progress" aria-label="Simulation progress">{STEP_LABELS.map((label, index) => <button type="button" key={label} className={`${state.step === index ? "active" : ""} ${state.step > index ? "done" : ""}`} onClick={() => index <= state.step && setStep(index)} disabled={index > state.step} aria-current={state.step === index ? "step" : undefined}><i>{state.step > index ? "✓" : index + 1}</i><span>{label}</span></button>)}</nav>
      <div className="planning-workspace">
        <main>{stepContent}{validationError && <div className="planning-validation" role="alert">{validationError}</div>}<div className="planning-navigation"><button type="button" onClick={() => setStep(Math.max(0, state.step - 1))} disabled={state.step === 0}>← Back</button>{state.step < 6 && <button type="button" onClick={continueStep}>Continue <span>→</span></button>}</div></main>
        <aside className="planning-summary">
          <header><span>Selected scope</span><b>{state.selectedReportIds.length} {state.selectedReportIds.length === 1 ? "report" : "reports"}</b></header>
          <dl className="summary-meta"><div><dt>Property</dt><dd>{state.propertyCount === 1 ? "One property" : "Several properties"}</dd></div><div><dt>Client</dt><dd>{CUSTOMER_TYPES.find((customer) => customer.id === state.customerType)?.label ?? "Not selected"}</dd></div><div><dt>Decision</dt><dd>{DECISION_OBJECTIVES.find((objective) => objective.id === state.decisionObjective)?.label ?? "Not selected"}</dd></div></dl>
          <div className="summary-items">{state.selectedReportIds.length ? state.selectedReportIds.map((id, index) => { const report = REPORT_BY_ID.get(id)!; return <div key={id}><span><i>{index + 1}</i><strong>{report.name}</strong></span><small>{report.priceCents !== null ? money(report.priceCents) : `From ${money(report.fromPriceCents ?? 0)}`}</small><button type="button" onClick={() => update({ selectedReportIds: state.selectedReportIds.filter((reportId) => reportId !== id) })}>Remove</button></div>; }) : <p>No reports selected.</p>}</div>
          <div className={`summary-price ${cataloguePricing?.quoteRequired ? "quote" : ""}`}><span>{cataloguePricing?.quoteRequired ? "Tailored engagement" : "Current price estimate"}</span><strong>{cataloguePricing?.quoteRequired ? "From A$3,500" : cataloguePricing?.totalCents != null ? money(cataloguePricing.totalCents) : "Select reports"}</strong><small>{cataloguePricing?.quoteRequired ? "No automatic payment amount." : "Server recalculates before checkout"}</small></div>
          <button type="button" className="restart-simulation" onClick={restart}>Restart simulation</button>
        </aside>
      </div>
      <div className="mobile-scope-bar"><span><b>{state.selectedReportIds.length} reports</b><small>{cataloguePricing?.quoteRequired ? "Tailored engagement" : cataloguePricing?.totalCents ? money(cataloguePricing.totalCents) : "Select reports"}</small></span>{state.step < 6 ? <button type="button" onClick={continueStep}>Continue →</button> : <button type="button" onClick={confirmOrder} disabled={saving || !cataloguePricing}>Review order →</button>}</div>
    </div>
  );
}

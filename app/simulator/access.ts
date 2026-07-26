export type SimulatorPlan = "preview" | "project" | "studio";

export type SimulatorEntitlement = {
  plan: SimulatorPlan;
  label: string;
  canRun: boolean;
  canSave: boolean;
  canExport: boolean;
  canCompare: boolean;
  runLimit: number | null;
};

/*
 * Subscription boundary
 * ---------------------
 * Replace this resolver with the chosen billing/session provider later.
 * The simulator UI and calculation engine only consume this entitlement object,
 * so Stripe, Clerk, Auth.js or another provider can be added without rewriting
 * the planning workflow.
 */
export function getSimulatorEntitlement(): SimulatorEntitlement {
  return {
    plan: "preview",
    label: "Project preview",
    canRun: true,
    canSave: false,
    canExport: false,
    canCompare: false,
    runLimit: null,
  };
}

export const futureSubscriptionFeatures = [
  "Saved property reports",
  "Side-by-side design scenarios",
  "PDF feasibility packs",
  "Shared architect workspace",
];

import type { OrderStatus } from "./types";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["awaiting_uploads", "ready_for_checkout", "tailored_quote_requested", "cancelled"],
  awaiting_uploads: ["draft", "ready_for_checkout", "tailored_quote_requested", "cancelled"],
  ready_for_checkout: ["awaiting_payment", "tailored_quote_requested", "cancelled"],
  awaiting_payment: ["payment_processing", "payment_expired", "cancelled"],
  payment_processing: ["paid", "awaiting_payment", "failed", "payment_expired"],
  paid: ["queued", "refunded", "partially_refunded"],
  queued: ["securing_files", "failed"],
  securing_files: ["analysing_property", "failed"],
  analysing_property: ["analysing_documents", "failed"],
  analysing_documents: ["generating_report", "awaiting_professional_review", "failed"],
  generating_report: ["automated_validation", "failed"],
  automated_validation: ["awaiting_professional_review", "approved_for_release", "failed"],
  awaiting_professional_review: ["changes_requested", "approved_for_release", "failed"],
  changes_requested: ["generating_report", "awaiting_professional_review", "cancelled"],
  approved_for_release: ["completed", "failed"],
  completed: ["refunded", "partially_refunded"],
  failed: ["queued", "cancelled"],
  cancelled: [],
  payment_expired: ["awaiting_payment", "cancelled"],
  refunded: [],
  partially_refunded: ["refunded"],
  tailored_quote_requested: ["cancelled"],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return from === to || transitions[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order status transition: ${from} → ${to}.`);
  }
}

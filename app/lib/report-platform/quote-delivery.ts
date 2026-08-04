/**
 * Shared quote inbox for website and simulator quote requests.
 * Prefer QUOTE_TO_EMAIL; fall back to HEAD_ARCHITECT_EMAIL for older deploys.
 */

function stripEnvQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getQuoteRecipientEmail() {
  const configured =
    stripEnvQuotes(process.env.QUOTE_TO_EMAIL ?? "") ||
    stripEnvQuotes(process.env.HEAD_ARCHITECT_EMAIL ?? "") ||
    "";
  return configured || "frcdesignconstruction@gmail.com";
}

export function getQuoteFromEmail() {
  return (
    stripEnvQuotes(process.env.QUOTE_FROM_EMAIL ?? "") ||
    "FRC Website <onboarding@resend.dev>"
  );
}

export function getResendApiKey() {
  return stripEnvQuotes(process.env.RESEND_API_KEY ?? "");
}

export const REPORT_QUOTE_TURNAROUND_COPY =
  "An AI draft report is prepared first. Because AI drafting can be inconsistent, an FRC professional reviews it so you receive everything included in your quoted scope within approximately one week.";

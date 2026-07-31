"use client";

import { useEffect, useState } from "react";

function decodeOrderId(token: string) {
  try {
    const payload = token.split(".")[0].replaceAll("-", "+").replaceAll("_", "/");
    return String((JSON.parse(atob(payload)) as { orderId?: string }).orderId ?? "");
  } catch {
    return "";
  }
}

export function MockCheckoutClient({ sessionId }: { sessionId: string }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const next = params.get("token") ?? "";
    queueMicrotask(() => setToken(next));
  }, []);

  const complete = async (outcome: "success" | "failed" | "expired") => {
    if (!token) return setMessage("The mock checkout token is missing.");
    setProcessing(true);
    setMessage(outcome === "success" ? "Verifying mock payment and generating the report…" : "Recording the test outcome…");
    try {
      const response = await fetch("/api/planning-simulation/mock-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, outcome }),
      });
      const result = await response.json() as {
        error?: string;
        jobId?: string;
        reportAccessToken?: string;
        recoverable?: boolean;
      };
      if (!response.ok) throw new Error(result.error || "The mock payment could not be processed.");
      if (outcome !== "success" || !result.jobId) {
        setMessage(outcome === "failed" ? "Mock payment failed. The order remains recoverable." : "Mock checkout expired. Return to the simulator to retry.");
        return;
      }
      const orderId = decodeOrderId(token);
      const orderAccess = window.sessionStorage.getItem(`frcReportOrderAccess:${orderId}`) ?? "";
      const access = result.reportAccessToken || orderAccess;
      window.sessionStorage.setItem(`frcReportJobAccess:${result.jobId}`, access);
      window.location.assign(`/report-status/${result.jobId}#access=${access}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The mock checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="mock-checkout-page">
      <section>
        <span>FRC · Safe local test mode</span>
        <h1>Mock payment checkout.</h1>
        <p>No card details are collected and no money moves. A successful test outcome is treated as a server-verified payment event and starts the deterministic mock report workflow.</p>
        <dl><div><dt>Session</dt><dd>{sessionId}</dd></div><div><dt>Provider</dt><dd>MockPaymentProvider</dd></div><div><dt>Live payments</dt><dd>Disabled</dd></div></dl>
        <div className="mock-checkout-actions">
          <button type="button" onClick={() => void complete("success")} disabled={processing || !token}>Simulate successful payment <span>→</span></button>
          <button type="button" onClick={() => void complete("failed")} disabled={processing || !token}>Simulate failed payment</button>
          <button type="button" onClick={() => void complete("expired")} disabled={processing || !token}>Simulate expired checkout</button>
        </div>
        {message && <div className="mock-checkout-message" role="status">{message}</div>}
      </section>
    </main>
  );
}

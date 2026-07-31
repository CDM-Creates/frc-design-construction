"use client";

import { useState } from "react";

type Readiness = {
  livePaymentsAllowed: boolean;
  liveAiAllowed: boolean;
  checks: Array<{ code: string; label: string; status: string; detail: string }>;
};

export function ReadinessClient() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/planning-simulation/readiness", { cache: "no-store", headers: { "X-Architect-Token": token } });
    const result = await response.json() as Readiness & { error?: string };
    if (!response.ok) return setError(result.error || "Readiness checks could not be loaded.");
    setData(result);
    setError("");
  };

  return (
    <main className="planning-admin-page readiness-page">
      <header><div><span>FRC · Production control</span><h1>Launch readiness.</h1><p>This protected validator never displays secret values. Live payment and live AI stay unavailable until every required legal, tax, storage, scanning, provider and rendering check passes.</p></div><aside><label><span>Administrator access token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label><button type="button" onClick={() => void load()}>Run readiness checks</button><small>{error}</small></aside></header>
      {data && <><section className="readiness-gates"><article className={data.livePaymentsAllowed ? "ready" : "blocked"}><span>Live payments</span><strong>{data.livePaymentsAllowed ? "Allowed" : "Blocked"}</strong></article><article className={data.liveAiAllowed ? "ready" : "blocked"}><span>Live report AI</span><strong>{data.liveAiAllowed ? "Allowed" : "Blocked"}</strong></article></section><section className="readiness-check-list">{data.checks.map((check) => <article key={check.code}><span className={check.status}>{check.status.replaceAll("_", " ")}</span><h2>{check.label}</h2><p>{check.detail}</p></article>)}</section></>}
    </main>
  );
}

"use client";

import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The enquiry could not be sent.");
      setStatus("success");
      form.reset();
    } catch (submissionError) {
      setStatus("error");
      setError(submissionError instanceof Error ? submissionError.message : "The enquiry could not be sent.");
    }
  };

  if (status === "success") {
    return <div className="contact-form-success" role="status"><span>Enquiry received</span><h2>Thank you for contacting FRC.</h2><p>Your message has been prepared for the lead architect. FRC will use the contact details supplied to respond.</p><button type="button" onClick={() => setStatus("idle")}>Send another enquiry</button></div>;
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="contact-form-heading"><span>Contact form</span><h2>Tell us what you need to discuss.</h2><p>For a detailed fee request, use the Request a Quote workflow so the property and project brief can be carried forward.</p></div>
      <div className="contact-form-grid">
        <label><span>Full name *</span><input name="fullName" autoComplete="name" required maxLength={120} /></label>
        <label><span>Email address *</span><input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
        <label><span>Phone number</span><input name="phone" type="tel" autoComplete="tel" maxLength={80} /></label>
        <label><span>Enquiry type *</span><select name="enquiryType" required defaultValue="General enquiry"><option>General enquiry</option><option>Project enquiry</option></select></label>
        <label><span>Preferred contact method *</span><select name="preferredContact" required defaultValue="Email"><option>Email</option><option>Phone call</option><option>Text message</option></select></label>
        <label><span>Project location or suburb</span><input name="suburb" autoComplete="address-level2" maxLength={150} /></label>
        <label className="wide"><span>Short message *</span><textarea name="message" required rows={6} maxLength={4000} placeholder="Briefly describe the question, project or site you would like to discuss." /></label>
      </div>
      <label className="contact-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      {status === "error" && <p className="contact-form-error" role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Sending enquiry…" : "Send Enquiry"}<span>→</span></button>
      <p className="contact-form-note">Your details are used only to respond to this enquiry. Email delivery depends on the secure website mail integration.</p>
    </form>
  );
}

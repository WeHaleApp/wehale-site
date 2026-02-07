// Netlify Function: /.netlify/functions/business
//
// Receives demo/lead requests from /business.html.
//
// Provider: Postmark
// Requires env:
// - POSTMARK_SERVER_TOKEN
// - BUSINESS_FROM_EMAIL (verified sender in Postmark) e.g. support@wehale.io or business@wehale.io
// Optional env:
// - BUSINESS_TO_EMAIL (default: business@wehale.io)
// - BUSINESS_REPLY_TO (default: business@wehale.io)
//
// Note: If your Postmark account is pending approval, sending to external domains may be blocked.
// This function only emails your internal inbox by default. (No external confirmation email.)

const POSTMARK_API = 'https://api.postmarkapp.com/email';

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(str = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}

async function postmarkSend({ token, payload }) {
  const res = await fetch(POSTMARK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Postmark error ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.BUSINESS_FROM_EMAIL || process.env.SUPPORT_FROM_EMAIL || 'support@wehale.io';
  const to = process.env.BUSINESS_TO_EMAIL || 'business@wehale.io';
  const replyTo = process.env.BUSINESS_REPLY_TO || 'business@wehale.io';

  if (!token) return { statusCode: 500, body: 'Missing POSTMARK_SERVER_TOKEN' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const botField = String(body.botField || '').trim();
  if (botField) return { statusCode: 200, body: 'ok' };

  const name = String(body.name || '').trim();
  const workEmail = String(body.email || '').trim();
  const company = String(body.company || '').trim();
  const teamSize = String(body.teamSize || '').trim();
  const interest = String(body.interest || '').trim();
  const notes = String(body.message || '').trim();

  if (!workEmail || !company) {
    return { statusCode: 400, body: 'Missing required fields' };
  }
  if (!isEmail(workEmail)) {
    return { statusCode: 400, body: 'Invalid email' };
  }

  const leadId = `BIZ-${Date.now().toString(36).toUpperCase()}`;
  const subject = `[Business] Demo request (${leadId}) — ${company}`;

  const html = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; color: #111;">
      <h2 style="margin: 0 0 12px;">New business inquiry</h2>
      <p style="margin: 0 0 8px;"><b>Lead ID:</b> ${esc(leadId)}</p>
      <p style="margin: 0 0 8px;"><b>Company:</b> ${esc(company)}</p>
      <p style="margin: 0 0 8px;"><b>Name:</b> ${esc(name || '(not provided)')}</p>
      <p style="margin: 0 0 8px;"><b>Email:</b> ${esc(workEmail)}</p>
      <p style="margin: 0 0 8px;"><b>Team size:</b> ${esc(teamSize || '(not provided)')}</p>
      <p style="margin: 0 0 8px;"><b>Interest:</b> ${esc(interest || '(not provided)')}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <h3 style="margin: 0 0 8px;">Notes</h3>
      <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #f9fafb; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb;">${esc(notes || '(none)')}</pre>
      <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">Submitted from ${esc(body.page || 'unknown page')} · UA: ${esc(body.userAgent || '')}</p>
    </div>
  `.trim();

  try {
    await postmarkSend({
      token,
      payload: {
        From: from,
        To: to,
        ReplyTo: workEmail,
        Subject: subject,
        HtmlBody: html,
        TextBody:
          `New business inquiry\nLead ID: ${leadId}\nCompany: ${company}\nName: ${name}\nEmail: ${workEmail}\nTeam size: ${teamSize}\nInterest: ${interest}\n\nNotes:\n${notes}`,
        MessageStream: 'outbound',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, leadId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || 'Failed' }),
    };
  }
};

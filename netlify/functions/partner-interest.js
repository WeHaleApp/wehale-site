// Netlify Function: /.netlify/functions/partner-interest
//
// The partner pages' "I want to be contacted" form. Same transport as support.js (Postmark), so a
// submission lands in the inbox the team already reads. Sends:
// 1) the interest to PARTNER_TO_EMAIL (default: SUPPORT_TO_EMAIL, default support@wehale.io)
// 2) a short confirmation to the sender
//
// Requires env: POSTMARK_SERVER_TOKEN, SUPPORT_FROM_EMAIL (verified in Postmark)
// Optional env: PARTNER_TO_EMAIL, SUPPORT_TO_EMAIL, SUPPORT_REPLY_TO, SUPPORT_FROM_NAME

const POSTMARK_API = 'https://api.postmarkapp.com/email';

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function isEmail(str = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}
async function postmarkSend({ token, payload }) {
  const res = await fetch(POSTMARK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Postmark-Server-Token': token },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Postmark error ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return { ok: true }; }
}

const MODEL_LABELS = { checkout: 'Gåvan i kassan', referral: 'Ambassadör', gift: 'Gästkoden' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const token = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.SUPPORT_FROM_EMAIL || 'support@wehale.io';
  const fromName = process.env.SUPPORT_FROM_NAME || 'WeHale';
  const from = `${fromName} <${fromEmail}>`;
  const to = process.env.PARTNER_TO_EMAIL || process.env.SUPPORT_TO_EMAIL || 'support@wehale.io';
  const replyTo = process.env.SUPPORT_REPLY_TO || 'support@wehale.io';
  if (!token) return { statusCode: 500, body: 'Missing POSTMARK_SERVER_TOKEN' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const name = String(body.name || '').trim().slice(0, 120);
  const business = String(body.business || '').trim().slice(0, 160);
  const email = String(body.email || '').trim().slice(0, 200);
  const reach = String(body.reach || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 4000);
  const partner = String(body.partner || '').trim().slice(0, 80);
  const models = Array.isArray(body.models) ? body.models.map((m) => MODEL_LABELS[String(m)] || null).filter(Boolean) : [];
  const botField = String(body.botField || '').trim();

  if (botField) return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // honeypot: pretend success
  if (!name || !isEmail(email)) return { statusCode: 400, body: 'Namn och en giltig e-post behövs.' };

  const subject = `Partnerintresse · ${business || name}${partner ? ` · via /for/${partner}` : ' · via /for'}`;
  const rows = [
    ['Namn', name], ['Verksamhet', business], ['E-post', email], ['Når sina gäster via', reach],
    ['Intresserad av', models.join(', ') || '(inget valt)'], ['Sida', partner ? `wehale.io/for/${partner}` : 'wehale.io/for'],
  ];
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Någon vill prata partnerskap</h2>
      <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}</table>
      ${message ? `<p style="margin:16px 0 4px;color:#666">Meddelande</p><p style="white-space:pre-wrap;margin:0">${esc(message)}</p>` : ''}
    </div>`;

  try {
    await postmarkSend({ token, payload: { From: from, To: to, ReplyTo: email, Subject: subject, HtmlBody: html, TextBody: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (message ? `\n\n${message}` : ''), MessageStream: 'outbound' } });
    await postmarkSend({ token, payload: {
      From: from, To: email, ReplyTo: replyTo,
      Subject: 'Tack, vi hör av oss inom två dagar',
      TextBody: `Hej ${name},\n\nTack för ditt intresse för ett samarbete med WeHale. Vi läser det du skrev och hör av oss inom två arbetsdagar med ett förslag på hur det skulle kunna se ut hos dig.\n\nVänliga hälsningar\nWeHale`,
      MessageStream: 'outbound',
    } });
  } catch (err) {
    console.error('partner-interest', err);
    return { statusCode: 502, body: 'Kunde inte skicka just nu. Försök igen om en stund.' };
  }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

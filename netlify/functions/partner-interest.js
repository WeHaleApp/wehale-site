// Netlify Function: /.netlify/functions/partner-interest
//
// The partner pages' "I want to be contacted" form. Mails through Resend, the same provider the
// API server uses (server/src/lib/email.ts), so one account and one verified sender. Sends:
// 1) the interest to PARTNER_TO_EMAIL (default: SUPPORT_TO_EMAIL, default support@wehale.io)
// 2) a short confirmation to the sender
//
// Requires env (Netlify → Site configuration → Environment variables): RESEND_API_KEY
// Optional env: RESEND_FROM_EMAIL (default "WeHale <noreply@wehale.io>"), PARTNER_TO_EMAIL,
//               SUPPORT_TO_EMAIL, SUPPORT_REPLY_TO


function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function isEmail(str = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}
const RESEND_API = 'https://api.resend.com/emails';

async function sendMail({ apiKey, from, to, replyTo, subject, html, text }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, html, text }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${body}`);
  try { return JSON.parse(body); } catch { return { ok: true }; }
}

const MODEL_LABELS = { checkout: 'Gåvan i kassan', referral: 'Din länk', gift: 'Gästkoden' };

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'WeHale <noreply@wehale.io>';
  const to = process.env.PARTNER_TO_EMAIL || process.env.SUPPORT_TO_EMAIL || 'support@wehale.io';
  const replyTo = process.env.SUPPORT_REPLY_TO || 'support@wehale.io';
  if (!apiKey) return { statusCode: 500, body: 'Missing RESEND_API_KEY' };

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
    await sendMail({ apiKey, from, to, replyTo: email, subject, html, text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (message ? `\n\n${message}` : '') });
    await sendMail({
      apiKey, from, to: email, replyTo,
      subject: 'Tack, vi hör av oss inom två dagar',
      text: `Hej ${name},\n\nTack för ditt intresse för ett samarbete med WeHale. Vi läser det du skrev och hör av oss inom två arbetsdagar med ett förslag på hur det skulle kunna se ut hos dig.\n\nVänliga hälsningar\nWeHale`,
      html: `<p>Hej ${esc(name)},</p><p>Tack för ditt intresse för ett samarbete med WeHale. Vi läser det du skrev och hör av oss inom två arbetsdagar med ett förslag på hur det skulle kunna se ut hos dig.</p><p>Vänliga hälsningar<br>WeHale</p>`,
    });
  } catch (err) {
    console.error('partner-interest', err);
    return { statusCode: 502, body: 'Kunde inte skicka just nu. Försök igen om en stund.' };
  }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

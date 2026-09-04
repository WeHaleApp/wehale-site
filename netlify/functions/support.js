// Netlify Function: /.netlify/functions/support
//
// Email provider:
// - Resend (the API server's provider too, server/src/lib/email.ts)
//
// Sends:
// 1) Support request email to SUPPORT_TO_EMAIL (default support@wehale.io)
// 2) Confirmation email to the user
//
// Requires env:
// - RESEND_API_KEY (Netlify → Site configuration → Environment variables)
// - RESEND_FROM_EMAIL optional, default "WeHale <noreply@wehale.io>" (a verified Resend sender)
// Optional env:
// - SUPPORT_TO_EMAIL (default: support@wehale.io)
// - SUPPORT_REPLY_TO (default: support@wehale.io)


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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'WeHale <noreply@wehale.io>';

  const to = process.env.SUPPORT_TO_EMAIL || 'support@wehale.io';
  const replyTo = process.env.SUPPORT_REPLY_TO || 'support@wehale.io';

  if (!apiKey) return { statusCode: 500, body: 'Missing RESEND_API_KEY' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const topic = String(body.topic || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const botField = String(body.botField || '').trim();

  // Spam honeypot
  if (botField) {
    return { statusCode: 200, body: 'ok' };
  }

  if (!topic || !email || !message) {
    return { statusCode: 400, body: 'Missing required fields' };
  }
  if (!isEmail(email)) {
    return { statusCode: 400, body: 'Invalid email' };
  }

  const requestId = `WH-${Date.now().toString(36).toUpperCase()}`;
  const subject = `[Support] ${topic} (${requestId})`;

  const supportHtml = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a; line-height: 1.45;">
      <div style="padding: 18px 18px 0;">
        <div style="font-weight: 800; letter-spacing: 0.2px; font-size: 18px;">WeHale Support</div>
        <div style="color:#64748b; font-size: 13px; margin-top: 2px;">New support request</div>
      </div>

      <div style="padding: 18px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
          <div style="margin: 0 0 6px;"><b>Request ID:</b> ${esc(requestId)}</div>
          <div style="margin: 0 0 6px;"><b>Topic:</b> ${esc(topic)}</div>
          <div style="margin: 0;"><b>From:</b> ${esc(email)}</div>
        </div>

        <h3 style="margin: 16px 0 10px; font-size: 14px;">Message</h3>
        <div style="white-space: pre-wrap; background: #ffffff; padding: 14px; border-radius: 14px; border: 1px solid #e2e8f0; color:#0f172a;">${esc(message)}</div>

        <div style="color: #64748b; font-size: 12px; margin: 14px 0 0;">
          Submitted from ${esc(body.page || 'unknown page')} · UA: ${esc(body.userAgent || '')}
        </div>
      </div>
    </div>
  `.trim();

  const confirmSubject = `We received your support request (${requestId})`;
  const confirmHtml = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a; line-height: 1.45;">
      <div style="padding: 18px 18px 0;">
        <div style="font-weight: 800; letter-spacing: 0.2px; font-size: 18px;">WeHale Support</div>
        <div style="color:#64748b; font-size: 13px; margin-top: 2px;">We’ve received your request</div>
      </div>

      <div style="padding: 18px;">
        <p style="margin: 0 0 12px;">Hi,</p>
        <p style="margin: 0 0 14px;">Thanks for reaching out. We’ve received your support request and will get back to you as soon as we can.</p>

        <div style="background: #0b1220; color: #f8fafc; padding: 16px; border-radius: 14px;">
          <div style="margin: 0 0 8px;"><b>Request ID:</b> ${esc(requestId)}</div>
          <div style="margin: 0 0 8px;"><b>Topic:</b> ${esc(topic)}</div>
          <div style="margin: 0;"><b>Your email:</b> ${esc(email)}</div>
        </div>

        <h3 style="margin: 18px 0 10px; font-size: 14px;">Your message</h3>
        <div style="white-space: pre-wrap; background: #ffffff; padding: 14px; border-radius: 14px; border: 1px solid #e2e8f0;">${esc(message)}</div>

        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">If you didn’t submit this request, you can ignore this email.</p>
        <p style="margin: 12px 0 0; color: #64748b; font-size: 12px;">— WeHale Support</p>
      </div>
    </div>
  `.trim();

  try {
    // 1) Send to support
    await sendMail({
      apiKey, from, to, replyTo: email, subject,
      html: supportHtml,
      text: `New support request\nRequest ID: ${requestId}\nTopic: ${topic}\nFrom: ${email}\n\n${message}`,
    });

    // 2) Send confirmation to user
    await sendMail({
      apiKey, from, to: email, replyTo, subject: confirmSubject,
      html: confirmHtml,
      text: `We received your support request (${requestId}).\n\nTopic: ${topic}\n\n${message}\n\n— WeHale Support`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, requestId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || 'Failed' }),
    };
  }
};

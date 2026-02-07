// Netlify Function: /.netlify/functions/support
//
// Email provider:
// - SendGrid (preferred in this repo setup)
//
// Sends:
// 1) Support request email to SUPPORT_TO_EMAIL (default support@wehale.io)
// 2) Confirmation email to the user
//
// Requires env:
// - SENDGRID_API_KEY
// - SUPPORT_FROM_EMAIL (must be verified/sender-authenticated in SendGrid) e.g. support@wehale.io
// Optional env:
// - SUPPORT_TO_EMAIL (default: support@wehale.io)
// - SUPPORT_REPLY_TO (default: support@wehale.io)

const SENDGRID_API = 'https://api.sendgrid.com/v3/mail/send';

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

async function sendgridSend({ apiKey, payload }) {
  const res = await fetch(SENDGRID_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // SendGrid returns 202 Accepted on success (no body)
  const text = await res.text().catch(() => '');
  if (res.status !== 202) {
    throw new Error(`SendGrid error ${res.status}: ${text}`);
  }

  return { ok: true };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SUPPORT_FROM_EMAIL || 'support@wehale.io';
  const to = process.env.SUPPORT_TO_EMAIL || 'support@wehale.io';
  const replyTo = process.env.SUPPORT_REPLY_TO || 'support@wehale.io';

  if (!apiKey) return { statusCode: 500, body: 'Missing SENDGRID_API_KEY' };

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
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; color: #111;">
      <h2 style="margin: 0 0 12px;">New support request</h2>
      <p style="margin: 0 0 8px;"><b>Request ID:</b> ${esc(requestId)}</p>
      <p style="margin: 0 0 8px;"><b>Topic:</b> ${esc(topic)}</p>
      <p style="margin: 0 0 8px;"><b>From:</b> ${esc(email)}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #f9fafb; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb;">${esc(message)}</pre>
      <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">Submitted from ${esc(body.page || 'unknown page')} · UA: ${esc(body.userAgent || '')}</p>
    </div>
  `.trim();

  const confirmSubject = `We received your support request (${requestId})`;
  const confirmHtml = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; color: #111;">
      <p style="margin: 0 0 12px;">Hi,</p>
      <p style="margin: 0 0 12px;">Thanks for reaching out. We’ve received your support request and will get back to you as soon as we can.</p>
      <div style="background: #0b1220; color: #f8fafc; padding: 16px; border-radius: 14px;">
        <p style="margin: 0 0 8px;"><b>Request ID:</b> ${esc(requestId)}</p>
        <p style="margin: 0 0 8px;"><b>Topic:</b> ${esc(topic)}</p>
        <p style="margin: 0 0 0;"><b>Your email:</b> ${esc(email)}</p>
      </div>
      <h3 style="margin: 18px 0 10px;">Your message</h3>
      <div style="background: #f9fafb; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb;">
        <pre style="white-space: pre-wrap; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${esc(message)}</pre>
      </div>
      <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">If you didn’t submit this request, you can ignore this email.</p>
      <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px;">— WeHale Support</p>
    </div>
  `.trim();

  try {
    // 1) Send to support (reply-to user)
    await sendgridSend({
      apiKey,
      payload: {
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: { email: from, name: 'WeHale Support' },
        reply_to: { email },
        content: [
          { type: 'text/plain', value: `New support request\nRequest ID: ${requestId}\nTopic: ${topic}\nFrom: ${email}\n\n${message}` },
          { type: 'text/html', value: supportHtml },
        ],
      },
    });

    // 2) Send confirmation to user (reply-to support)
    await sendgridSend({
      apiKey,
      payload: {
        personalizations: [
          {
            to: [{ email }],
            subject: confirmSubject,
          },
        ],
        from: { email: from, name: 'WeHale Support' },
        reply_to: { email: replyTo },
        content: [
          { type: 'text/plain', value: `We received your support request (${requestId}).\n\nTopic: ${topic}\n\n${message}\n\n— WeHale Support` },
          { type: 'text/html', value: confirmHtml },
        ],
      },
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

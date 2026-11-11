const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function buildHtml({ header, body, footer }) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto">
    <h2>${escapeHtml(header)}</h2>
    <div>${escapeHtml(body).replace(/\r?\n/g, "<br>")}</div>
    <hr><p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>
  </div>`;
}

async function sendEmail({ to, toName, subject, header, body, footer }) {
  const { EMAIL_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME = "EasyFood" } = process.env;
  if (!EMAIL_API_KEY || !EMAIL_FROM) {
    throw new Error("Configure EMAIL_API_KEY e EMAIL_FROM");
  }
  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { Authorization: `Bearer ${EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
      to: [{ email: to, name: toName || to }],
      subject,
      html: buildHtml({ header, body, footer }),
      text: `${header}\n\n${body}\n\n${footer}`,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`MailerSend retornou HTTP ${response.status}`);
  console.info("[EMAIL] Mensagem aceita pelo MailerSend");
}

module.exports = { sendEmail };

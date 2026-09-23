const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Send an email via Resend HTTP API (primary) or Nodemailer SMTP fallback.
 * Sends from contact@fmpg.in with reply-to pointing to personal address fmpg974@gmail.com
 */
async function sendMail(mailOptions, callback) {
  const promise = (async () => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const to = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
      
      // Determine 'from' address (always use verified @fmpg.in sender)
      let from = process.env.EMAIL_FROM || 'FMPG <contact@fmpg.in>';
      if (mailOptions.from && mailOptions.from.includes('@fmpg.in')) {
        from = mailOptions.from;
      }

      // Determine 'reply_to' address (defaults to fmpg974@gmail.com so replies go to personal inbox)
      const replyTo = mailOptions.replyTo || mailOptions.reply_to || process.env.REPLY_TO_EMAIL || 'fmpg974@gmail.com';

      // Build well-formed HTML to prevent spam trigger on malformed/bare content
      let htmlBody = mailOptions.html;
      if (!htmlBody && mailOptions.text) {
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 15px;">${mailOptions.text.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">FMPG &bull; Automated notification. Need help? Reply directly to this email.</p>
          </div>
        `;
      }

      const payload = {
        from,
        to,
        reply_to: replyTo,
        subject: mailOptions.subject || '(No Subject)',
        text: mailOptions.text || undefined,
        html: htmlBody || undefined,
        headers: {
          'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
      };

      // Process attachments if any (PDFs, invoices, etc.)
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        payload.attachments = mailOptions.attachments.map((att) => {
          let content = att.content;
          if (!content && att.path) {
            try {
              content = fs.readFileSync(att.path).toString('base64');
            } catch (err) {
              console.error('Failed to read attachment path:', att.path, err);
            }
          } else if (Buffer.isBuffer(content)) {
            content = content.toString('base64');
          } else if (typeof content === 'string') {
            content = Buffer.from(content).toString('base64');
          }
          return {
            filename: att.filename,
            content,
          };
        });
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Resend API error: ${data.message || JSON.stringify(data)}`);
      }

      return { messageId: data.id, provider: 'resend', success: true };
    }

    // SMTP Fallback if RESEND_API_KEY is not set
    const fallbackTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'fmpg974@gmail.com',
        pass: process.env.EMAIL_PASS,
      },
    });

    if (!mailOptions.replyTo) {
      mailOptions.replyTo = process.env.REPLY_TO_EMAIL || 'fmpg974@gmail.com';
    }
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_FROM || 'contact@fmpg.in';
    }

    return await fallbackTransporter.sendMail(mailOptions);
  })();

  if (typeof callback === 'function') {
    promise
      .then((info) => callback(null, info))
      .catch((err) => callback(err, null));
    return;
  }

  return promise;
}

const transporter = {
  sendMail: (options, callback) => sendMail(options, callback),
};

module.exports = {
  sendMail,
  transporter,
};

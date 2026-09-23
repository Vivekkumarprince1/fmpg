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

      const payload = {
        from,
        to,
        reply_to: replyTo,
        subject: mailOptions.subject || '(No Subject)',
        text: mailOptions.text || undefined,
        html: mailOptions.html || (mailOptions.text ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${mailOptions.text.replace(/\n/g, '<br>')}</div>` : undefined),
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

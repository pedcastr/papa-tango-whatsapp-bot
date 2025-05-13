const nodemailer = require('nodemailer');
const logger = require('./logger');

// Configurar o transporter do nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'seu-email-de-servico@gmail.com',
    pass: process.env.EMAIL_PASS || 'sua-senha-de-app'
  }
});

/**
 * Envia um email de notificação
 * @param {string} to - Email do destinatário
 * @param {string} subject - Assunto do email
 * @param {string} text - Texto do email (versão plain text)
 * @param {string} html - Conteúdo HTML do email
 * @returns {Promise<boolean>} - Retorna true se o email foi enviado com sucesso
 */
async function sendEmail(to, subject, text, html) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'seu-email-de-servico@gmail.com',
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email enviado para ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Erro ao enviar email para ${to}:`, error);
    return false;
  }
}

/**
 * Envia uma notificação de QR code
 * @param {string} to - Email do destinatário
 * @param {string} qrCodeUrl - URL para acessar o QR code
 * @returns {Promise<boolean>} - Retorna true se o email foi enviado com sucesso
 */
async function sendQrCodeNotification(to, qrCodeUrl) {
  const subject = 'Papa Tango Bot - Novo QR Code disponível';
  const text = `Um novo QR code foi gerado para o bot do WhatsApp e precisa ser escaneado.
  
Acesse o link abaixo para escanear o QR code:
${qrCodeUrl}

Este link ficará disponível até que o QR code seja escaneado.

Atenciosamente,
Equipe Papa Tango`;

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
    <h2 style="color: #333; text-align: center;">Papa Tango Bot - Novo QR Code</h2>
    <p>Um novo QR code foi gerado para o bot do WhatsApp e precisa ser escaneado.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${qrCodeUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
        Acessar QR Code
      </a>
    </div>
    <p>Este link ficará disponível até que o QR code seja escaneado.</p>
    <p>Atenciosamente,<br>Equipe Papa Tango</p>
  </div>
  `;

  return await sendEmail(to, subject, text, html);
}

module.exports = {
  sendEmail,
  sendQrCodeNotification
};

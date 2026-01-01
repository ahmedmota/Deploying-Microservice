const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const logger = require('../utils/logger');

let transporter;

const initializeEmailProvider = () => {
  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  if (provider === 'ses') {
    // AWS SES
    AWS.config.update({
      region: process.env.AWS_SES_REGION || 'ap-southeast-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    transporter = nodemailer.createTransport({
      SES: new AWS.SES({ apiVersion: '2010-12-01' }),
    });

    logger.info('Email provider initialized: AWS SES');
  } else {
    // SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    logger.info('Email provider initialized: SMTP');
  }
};

const sendEmail = async (to, subject, html, text) => {
  if (!transporter) {
    initializeEmailProvider();
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  initializeEmailProvider,
  sendEmail,
};

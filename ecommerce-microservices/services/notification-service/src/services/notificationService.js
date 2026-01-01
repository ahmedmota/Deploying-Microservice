const { Notification } = require('../models');
const { sendEmail } = require('../config/email');
const { getTemplate } = require('../templates/emailTemplates');
const logger = require('../utils/logger');

const sendNotification = async (userId, type, channel, recipient, data) => {
  try {
    // Create notification record
    const notification = await Notification.create({
      userId,
      type,
      channel,
      recipient,
      status: 'pending',
      metadata: data,
    });

    let result;

    if (channel === 'email') {
      const template = getTemplate(type, data);
      notification.subject = template.subject;
      notification.content = template.html;

      try {
        result = await sendEmail(recipient, template.subject, template.html, template.text);
        notification.status = 'sent';
        notification.sentAt = new Date();
      } catch (error) {
        notification.status = 'failed';
        notification.error = error.message;
        logger.error('Failed to send email:', error);
      }
    } else if (channel === 'sms') {
      // Mock SMS sending
      logger.info(`Sending SMS to ${recipient}: ${type}`);
      notification.content = `${type}: ${JSON.stringify(data)}`;
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else if (channel === 'push') {
      // Mock push notification
      logger.info(`Sending push notification to ${recipient}: ${type}`);
      notification.content = `${type}: ${JSON.stringify(data)}`;
      notification.status = 'sent';
      notification.sentAt = new Date();
    }

    await notification.save();
    logger.info(`Notification sent: ${notification.id}`);

    return notification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
};

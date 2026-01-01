const templates = {
  order_confirmation: (data) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order!</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Total Amount:</strong> $${data.amount}</p>
      <p>We'll send you a notification when your order ships.</p>
    `,
    text: `Order Confirmation\n\nThank you for your order!\n\nOrder Number: ${data.orderNumber}\nTotal Amount: $${data.amount}\n\nWe'll send you a notification when your order ships.`,
  }),

  payment_success: (data) => ({
    subject: 'Payment Successful',
    html: `
      <h1>Payment Successful</h1>
      <p>Your payment has been processed successfully.</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Amount:</strong> $${data.amount}</p>
      <p>Thank you for your purchase!</p>
    `,
    text: `Payment Successful\n\nYour payment has been processed successfully.\n\nOrder Number: ${data.orderNumber}\nAmount: $${data.amount}\n\nThank you for your purchase!`,
  }),

  payment_failed: (data) => ({
    subject: 'Payment Failed',
    html: `
      <h1>Payment Failed</h1>
      <p>Unfortunately, your payment could not be processed.</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p>Please try again or use a different payment method.</p>
    `,
    text: `Payment Failed\n\nUnfortunately, your payment could not be processed.\n\nOrder Number: ${data.orderNumber}\n\nPlease try again or use a different payment method.`,
  }),

  order_shipped: (data) => ({
    subject: `Your Order Has Shipped - ${data.orderNumber}`,
    html: `
      <h1>Your Order Has Shipped</h1>
      <p>Great news! Your order is on its way.</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'Will be updated soon'}</p>
    `,
    text: `Your Order Has Shipped\n\nGreat news! Your order is on its way.\n\nOrder Number: ${data.orderNumber}\nTracking Number: ${data.trackingNumber || 'Will be updated soon'}`,
  }),

  payment_refund: (data) => ({
    subject: 'Refund Processed',
    html: `
      <h1>Refund Processed</h1>
      <p>Your refund has been processed.</p>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Refund Amount:</strong> $${data.amount}</p>
      <p>The funds will be returned to your original payment method within 5-10 business days.</p>
    `,
    text: `Refund Processed\n\nYour refund has been processed.\n\nOrder Number: ${data.orderNumber}\nRefund Amount: $${data.amount}\n\nThe funds will be returned to your original payment method within 5-10 business days.`,
  }),
};

const getTemplate = (type, data) => {
  const template = templates[type];
  if (!template) {
    return {
      subject: 'Notification',
      html: `<p>${JSON.stringify(data)}</p>`,
      text: JSON.stringify(data),
    };
  }
  return template(data);
};

module.exports = { getTemplate };

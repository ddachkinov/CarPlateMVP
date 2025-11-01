/**
 * Email Service - Handles all email sending via Resend
 * Uses Resend API for reliable email delivery
 */

const { Resend } = require('resend');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'CarPlate <noreply@carplate.app>';

/**
 * Send welcome email when user claims their first plate
 */
const sendWelcomeEmail = async ({ email, plate }) => {
  if (!resend) {
    console.warn('⚠️  Resend not configured. Skipping welcome email.');
    return { success: false, error: 'Email service not configured' };
  }

  console.log('📧 Attempting to send welcome email to:', email, 'for plate:', plate);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to CarPlate! Plate ${plate} claimed successfully`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #007bff; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">🚗 Welcome to CarPlate!</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px;">Hi there! 👋</p>

            <p>You've successfully claimed plate <strong style="font-size: 18px; color: #007bff;">${plate}</strong></p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>✅ What happens now?</strong></p>
              <ul>
                <li>You'll receive email notifications when someone sends a message to your plate</li>
                <li>All messages are anonymous and privacy-respecting</li>
                <li>You can view all messages in your inbox at any time</li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              This email was sent because you claimed a license plate on CarPlate.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Welcome email sent to:', email);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification email when plate receives a message
 */
const sendMessageNotificationEmail = async ({ email, plate, message, senderInfo }) => {
  if (!resend) {
    console.warn('⚠️  Resend not configured. Skipping notification email.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Determine if message is urgent
    const urgentKeywords = ['blocking', 'alarm', 'emergency', 'headlights', 'lights'];
    const isUrgent = urgentKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${isUrgent ? '🚨 URGENT' : '💬'} New message for your plate ${plate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${isUrgent ? '#dc3545' : '#007bff'}; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">${isUrgent ? '🚨' : '💬'} New Message for Your Car</h1>
            <p style="margin: 10px 0 0 0;">Plate: <strong>${plate}</strong></p>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Message from ${senderInfo || 'Anonymous'}:</p>
              <p style="margin: 0; font-size: 18px; font-weight: 500;">"${message}"</p>
            </div>

            ${isUrgent ? `
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24;"><strong>⚠️ This message may require immediate attention!</strong></p>
              </div>
            ` : ''}

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              You received this email because someone sent a message to your claimed plate ${plate}.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send notification email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Notification email sent to:', email, 'for plate:', plate);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if email service is properly configured
 */
const isConfigured = () => {
  return !!resend;
};

module.exports = {
  sendWelcomeEmail,
  sendMessageNotificationEmail,
  isConfigured
};

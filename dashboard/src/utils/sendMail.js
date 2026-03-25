import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

// 1. Configure the transporter with your SMTP details
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Replace with your provider's SMTP server
  port: 587,              // 587 for TLS, 465 for SSL
  secure: false,          // true for 465, false for 587
  auth: {
    user: 'yashbavkar26@gmail.com',
    pass: 'iinaqdezeysjioqu' // Use an App Password if using Gmail
  }
});

// 2. Create the function to send the email
const sendEmail = async (toEmail, subject, textContent) => {
  try {
    const info = await transporter.sendMail({
      from: '"SwachhTrack Admin" <yashbavkar26@gmail.com>', // Sender address (Admin)
      to: toEmail,                                        // List of receivers
      subject: subject,                                   // Subject line
      text: textContent,                                  // Plain text body
      // html: "<b>Hello world?</b>",                     // You can also send HTML
    });

    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// Example Usage:
// sendEmail('recipient@example.com', 'Test Subject', 'This is the email body!');

// Test execution when running `node sendMail.js` directly
const isMain = process.argv[1] === fileURLToPath(import.meta.url).replace(/\\/g, '/');
if (process.argv[1] === fileURLToPath(import.meta.url) || isMain || process.argv[1].endsWith('sendMail.js')) {
  const anomalySubject = '⚠️ ALERT: Worker Anomaly Detected';
  const anomalyText = `URGENT ALERT: An anomaly has been detected in worker activity.

Anomaly Details:
----------------
Time: ${new Date().toLocaleString()}
Alert Type: Route Deviation / Inactivity
Severity: HIGH

Please log in to the SwachhTrack Dashboard immediately to review the worker's status and location history.

- SwachhTrack Automated System`;

  // Sending the test email to the receiving address
  console.log("Sending test email to swachhtrack...");
  sendEmail('swachhtrack@gmail.com', anomalySubject, anomalyText);
}

export default sendEmail;

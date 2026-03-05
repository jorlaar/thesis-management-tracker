import nodeMailer from 'nodemailer';
import { Mail } from '@anjorlar/email';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';

class nodeMailerEmailService {
  private transporter: nodeMailer.Transporter;
  constructor() {
    this.transporter = nodeMailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.email_user,
        pass: env.email_password
      }
    });

    logger.message('Gmail email service initialized');
  }

  private async sendEmail(
    recipient: string | string[],
    subject: string,
    text?: string,
    html?: string
  ) {
    const mailOptions: Mail = {
      from: env.email_user,
      to: recipient,
      reply_to: env.email_user,
      subject,
      text,
      html
    };

    try {
      // await this.transporter.verify();
      // console.log('✅ Server is ready to send emails');

      // const info =
      await this.transporter.sendMail(mailOptions);
      logger.message(`Email sent successfully to ${recipient}`);
      // console.log(`Email sent successfully to ${recipient}`, info);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  sendWelcomeEmail(recipient: string, name: string) {
    const subject = 'Welcome to Thesis Management!';
    const text = `Hello ${name},\n\nWelcome to Thesis Management Portal! We're excited to have you on board. \n\nBest regards,\nThe Thesis Management Team`;
    const html = `<p>Hello ${name},</p><p>Welcome to Thesis Management Portal! We're excited to have you on board. </p><p>Best regards,<br>The Thesis Management Team</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendThesisSubmissionConfirmationEmail(recipient: string, name: string) {
    const subject = 'Thesis Submission Confirmation';
    const text = `Hello ${name},\n\nYour thesis has been successfully submitted! We will review it and get back to you with feedback as soon as possible.\n\nBest regards,\nThe Thesis Management Team`;
    const html = `<p>Hello ${name},</p><p>Your thesis has been successfully submitted! We will review it and get back to you with feedback as soon as possible.</p><p>Best regards,<br>The Thesis Management Team</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendThesisApprovalEmail(recipient: string, name: string) {
    const subject = 'Thesis Approval Notification';
    const text = `Hello ${name},\n\nCongratulations! Your thesis has been approved. \n\nBest regards,\nThe Thesis Management Team`;
    const html = `<p>Hello ${name},</p><p>Congratulations! Your thesis has been approved. We will contact you with the next steps shortly.</p><p>Best regards,<br>The Thesis Management Team</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendThesisRejectionEmail(recipient: string, name: string) {
    const subject = 'Thesis Rejection Notification';
    const text = `Hello ${name},\n\nWe regret to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.\n\nBest regards,\nThe Thesis Management Team`;
    const html = `<p>Hello ${name},</p><p>We regret to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.</p><p>Best regards,<br>The Thesis Management Team</p>`;

    this.sendEmail(recipient, subject, text, html);
  }
}

export default new nodeMailerEmailService();

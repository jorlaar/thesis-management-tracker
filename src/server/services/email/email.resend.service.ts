import { CreateEmailOptions, Resend } from 'resend';
import env from '@app/common/config/env';
import { Mail } from '@anjorlar/email';
import logger from '@app/common/services/logger';

class EmailService {
  private resend: Resend;
  constructor() {
    this.resend = new Resend(env.resend_api_key);
    logger.message('Email service initialized');
    console.log('Email service initialized:', this.resend);
  }

  /**
   * Maps the email object to the format required by the Resend API
   * @param mail
   * @returns
   */
  private mapEmailToResendFormat(mail: Mail): CreateEmailOptions {
    return {
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      replyTo: mail.reply_to,
      text: mail.text,
      html: mail.html,
      ...(mail.cc && { cc: mail.cc }),
      ...(mail.bcc && { bcc: mail.bcc }),
      ...(mail.scheduled_at && { scheduledAt: mail.scheduled_at }),
      ...(mail.attachments && { attachments: mail.attachments })
    };
  }

  /**
   * Sends an email to a user's email address
   * @param recipient Email address of the recipient(s)
   * @param subject Email subject
   * @param message text content of the message
   * @param text Optional plain text content of the email
   * @param html Optional HTML content of the email
   */
  async sendEmail(
    recipient: string | string[],
    subject: string,
    text?: string,
    html?: string
  ) {
    const notification: Mail = {
      from: env.email_from,
      to: recipient,
      reply_to: env.email_from,
      subject,
      text,
      html
    };

    try {
      const resendEmailData = this.mapEmailToResendFormat(notification);

      const emaildata = await this.resend.emails.send(resendEmailData);

      console.log('Email sent successfully:', emaildata);
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

export default new EmailService();

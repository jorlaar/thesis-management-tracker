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
    html?: string,
    sender_email?: string,
    sender_name?: string,
    file_url?: string,
    usercomment?: string
  ) {
    const mailOptions: Mail = {
      from: env.email_user,
      to: recipient,
      reply_to: sender_email || env.email_user,
      ...(sender_email && { cc: sender_email }),
      ...(sender_name && { sender_name }),
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

  sendLecturerThesisApprovalEmail(
    recipient: string,
    name: string,
    lecturer_name: string
  ) {
    const subject = 'Thesis Approval Notification';

    let sender_details = lecturer_name
      ? `Prof/Dr/Mr ${lecturer_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\nCongratulations! Your thesis has been approved. \n\nBest regards,\n${sender_details}`;
    const html = `<p>Hello ${name},</p><p>Congratulations! Your thesis has been approved.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendMethodologyThesisApprovalEmail(
    recipient: string,
    name: string,
    methodology_name: string
  ) {
    const subject = 'Thesis Approval Notification';

    let sender_details = methodology_name
      ? `Prof/Dr/Mr ${methodology_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\nCongratulations! Your thesis has been approved. \n\nBest regards,\n${sender_details}`;
    const html = `<p>Hello ${name},</p><p>Congratulations! Your thesis has been approved.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendLecturerThesisReviewEmail(
    recipient: string,
    name: string,
    lecturer_name: string
  ) {
    const subject = 'Supervisor Thesis Review Notification';

    let sender_details = lecturer_name
      ? `Prof/Dr/Mr ${lecturer_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\nYour thesis has been reviewed. Please check the feedback and make the necessary revisions.\n\nBest regards,\n ${sender_details}`;
    const html = `<p>Hello ${name},</p><p>Your thesis has been reviewed by your supervisor. Please check the feedback and make the necessary revisions.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  sendMethodologyThesisReviewEmail(
    recipient: string,
    name: string,
    methodology_name: string
  ) {
    const subject = 'Methodology Thesis Review Notification';

    let sender_details = methodology_name
      ? `Prof/Dr/Mr ${methodology_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\nYour thesis has been reviewed. Please check the feedback and make the necessary revisions.\n\nBest regards,\n ${sender_details}`;
    const html = `<p>Hello ${name},</p><p>Your thesis has been reviewed. Please check the feedback and make the necessary revisions.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(recipient, subject, text, html);
  }

  /**
   * Sends an email to the student notifying them of their thesis rejection by the lecturer, including any comments and an optional file attachment.
   * @param recipient
   * @param name
   * @param sender_name
   * @param sender_email
   * @param usercomment
   * @param file_url
   */
  sendThesisLecturerRejectionEmail(
    recipient: string,
    name: string,
    sender_name: string,
    sender_email: string,
    usercomment?: string,
    file_url?: string
  ) {
    const subject = 'Thesis Rejection Notification';

    let sender_details = sender_name
      ? `Prof/Dr/Mr ${sender_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\n I will like to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.\n\nBest regards,\n ${sender_details}`;
    const html = `<p>Hello ${name},</p><p> We will like to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(
      recipient,
      subject,
      text,
      html,
      sender_email,
      sender_name,
      usercomment,
      file_url
    );
  }

  /**
   * Sends an email to the student notifying them of their thesis rejection by the methodology, including any comments and an optional file attachment.
   * @param recipient
   * @param name
   * @param sender_name
   * @param sender_email
   * @param usercomment
   * @param file_url
   */
  sendThesisMethodologyRejectionEmail(
    recipient: string,
    name: string,
    sender_name: string,
    sender_email: string,
    usercomment?: string,
    file_url?: string
  ) {
    const subject = 'Thesis Rejection Notification';

    let sender_details = sender_name
      ? `Prof/Dr/Mr ${sender_name}`
      : 'The Thesis Management Team';

    const text = `Hello ${name},\n\n I will like to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.\n\nBest regards,\n ${sender_details}`;
    const html = `<p>Hello ${name},</p><p> We will like to inform you that your thesis has been rejected. Please review the feedback provided and consider resubmitting after making the necessary revisions.</p><p>Best regards,<br>${sender_details}</p>`;

    this.sendEmail(
      recipient,
      subject,
      text,
      html,
      sender_email,
      sender_name,
      usercomment,
      file_url
    );
  }
}

export default new nodeMailerEmailService();

import nodeMailer from 'nodemailer';
import { Mail } from '@anjorlar/email';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';
import { URL } from 'url';

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

  sendPasswordResetEmail(recipient: string, name: string, reset_link: string) {
    console.log(
      'Password reset token generated successfully email',
      reset_link,
      recipient,
      name
    );

    // Extract token from reset_link (assuming format like: https://yourapp.com/reset?token=123456)
    const token =
      new URL(reset_link).searchParams.get('token') ||
      reset_link.split('/').pop() ||
      reset_link;

    const subject = 'Password Reset Request';
    const text = `Hello ${name},\n\nWe received a request to reset your password.\n\nYour reset token is: ${token}\n\nYou can also use this link: ${reset_link}\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe Thesis Management Team`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password.</p>
      
      <div style="background-color: #f5f5f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Your reset token:</strong></p>
        <div style="background-color: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: space-between;">
          <code style="font-size: 18px; font-weight: bold; color: #333;">${token}</code>
          <button onclick="navigator.clipboard.writeText('${token}')" 
                  style="background-color: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
            Copy
          </button>
        </div>
      </div>
      
      <p>Or click the link below to reset your password:</p>
      <p><a href="${reset_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
      <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
      <p style="margin-top: 30px;">Best regards,<br>The Thesis Management Team</p>
    </div>
  `;

    this.sendEmail(recipient, subject, text, html);
  }
}

export default new nodeMailerEmailService();

declare module '@anjorlar/email' {
  // for email, sms, push, in-app (webapp), etc notifications
  export interface Mail {
    from: string; // sender
    to: string | string[]; // recipient(s)
    subject: string;
    reply_to: string;
    cc?: string | string[];
    bcc?: string | string[];
    scheduled_at?: string; //  (e.g.: in 1 min) or ISO 8601 format (e.g: 2024-08-05T11:52:01.858Z)
    text?: string;
    html?: string;
    attachments?: [];
    template?: never;
    // text?: {
    //   name?: string;
    //   data?: any;
    // };
  }

  export type FileType =
    | 'pdf'
    | 'doc'
    | 'docs'
    | 'xls'
    | 'xlsx'
    | 'csv'
    | 'txt'
    | 'jpg'
    | 'jpeg'
    | 'png'
    | 'gif'
    | 'html';
}

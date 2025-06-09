declare module '@random-guys/notification' {
  export interface upload {
    message?: string;
    subject?: string;
    file: FileType;
    template?: {
      name?: string;
      data?: any;
    };
  }

  export type FileType = 'pdf' | 'doc' | 'docs';
}

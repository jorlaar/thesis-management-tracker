import jSend from 'jsend';

declare global {
  namespace Express {
    export interface Request {
      data: any;
      student_data: any;
      lecturer_data: any;
      admin_data: any;
      methodology_data: any;
      id: string;
      file?: Multer.File;
      files?:
        | {
            [fieldname: string]: Multer.File[];
          }
        | Multer.File[];
      formData: any;
    }

    export interface Response {
      body: any;
      jSend: jSend;
    }
  }
}

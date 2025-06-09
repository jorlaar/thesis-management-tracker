import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  httpPut,
  response,
  request
} from 'inversify-express-utils';
import upload from '../../middlewares/multerConfig';
import cloudinaryService from '@app/server/services/cloudinary/cloudinary.service';
import { generateId } from '@app/server/utils';
import authVerify from '@app/server/middlewares/auth.verify';

@controller('/upload', authVerify)
export default class UploadController extends BaseController {
  @httpPut('/', upload.single('file_url')) // 'file' is the field name in the form
  async uploadFile(@request() req: Request, @response() res: Response) {
    try {
      // Access the uploaded file

      const file_url = req.file;

      if (!file_url) {
        throw new Error('No file uploaded');
      }
      const thesis_tracking_id = generateId();

      // Access other form fields
      const otherField = req.body.otherField;
      console.log('>>>>> otherField', otherField);
      const fileUpload = await cloudinaryService.uploadFile(
        file_url as unknown as string,
        `babcock-thesis`,
        'raw',
        `${thesis_tracking_id}`
      );

      this.handleSuccess(req, res, { fileUpload: fileUpload.secure_url });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}

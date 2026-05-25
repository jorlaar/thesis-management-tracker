import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  // httpPut,
  response,
  request,
  httpGet,
  queryParam
  // requestParam
} from 'inversify-express-utils';
// import upload from '../../middlewares/multerConfig';
import cloudinaryService from '@app/server/services/cloudinary/cloudinary.service';
import { generateUlid } from '@app/server/utils';
import authVerify from '@app/server/middlewares/auth.verify';
import { ActionNotAllowedError, ControllerError } from '../base';
import S3Storage from '@app/server/services/s3/s3.service';
import {
  // SignedUrlOperation,
  SupportedContentType,
  SupportedContentTypes
} from '@app/server/services/s3/s3.type';
import env from '@app/common/config/env';

@controller('/upload', authVerify) // i can either sepearate to student, lecturers and methodology upload api later
export default class UploadController extends BaseController {
  // @httpPut('/', upload.single('file_url')) // 'file' is the field name in the form
  async uploadFile(@request() req: Request, @response() res: Response) {
    try {
      // Access the uploaded file
      // console.log('>>>>>>>>> req', req);
      // console.log('>>>>>>>>> req', req.body);
      // console.log('>>>>>>>>> file', req.file);

      const { fieldname, mimetype } = req.file;

      if (
        ![...SupportedContentTypes].includes(mimetype as SupportedContentType)
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (!fieldname) {
        throw new ControllerError('No file uploaded');
      }
      const thesis_tracking_id = generateUlid();
      // console.log('>>>>>>>>> fieldname', fieldname);

      // Access other form fields
      req.body.otherField;
      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_tracking_id}`
      );

      this.handleSuccess(req, res, { fileUpload: fileUpload.secure_url });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  // @httpPut('/download/:public_id', authVerify)
  // async downloadFile(@request() req: Request, @response() res: Response) {
  //   try {
  //     const { public_id } = req.params;

  //     if (!public_id) {
  //       throw new ControllerError('No public_id provided');
  //     }

  //     const fileUrl = await cloudinaryService.(public_id);

  //     this.handleSuccess(req, res, { fileUrl });
  //   } catch (err) {
  //     this.handleError(req, res, err);
  //   }
  // }

  @httpGet('/signed-url/get/:operation?')
  async getASignedURL(
    @request() req: Request,
    @response() res: Response,
    @queryParam('mime_type') mimeType: SupportedContentType
    // @requestParam('operation') operation: SignedUrlOperation
  ) {
    try {
      // console.log('>>>>>>>>> req.params.operation', req.params.operation);
      // console.log('>>>>>>>>> llioperation', operation);
      // console.log('>>>>>>>>> bbn mimeType', mimeType);
      // if (!req.params.operation) operation = 'putObject';

      if (![...SupportedContentTypes].includes(mimeType)) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      const signedUrl = await S3Storage.getSignedUrl(
        // operation,
        'putObject',
        process.env.THESIS_BUCKET!,
        `thesis_uploads/${generateUlid()}`,
        mimeType,
        300
      );

      this.handleSuccess(req, res, { signedUrl });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}

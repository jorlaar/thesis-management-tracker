//upload thesis
// lecturer review thesis either with comment or no comment
//methodology review thesis

import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  //   httpPost,
  response,
  request,
  requestBody,
  httpPut
} from 'inversify-express-utils';
import { thesisUploadValidator } from './thesis.validator';
import { ThesisDTO } from './thesis.dto';
// import env from '@app/common/config/env';
import authVerify from '@app/server/middlewares/auth.verify';
// import studentRepo from '@app/data/student/student.repo';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
// import cloudinaryService from '@app/server/services/cloudinary/cloudinary.service';
import { generateId } from '@app/server/utils';
import thesisRepo from '@app/data/thesis/thesis.repo';
import { THESIS_STATUS } from '@app/data/thesis/thesis.model';

@controller('/thesis', authVerify)
export default class ThesisController extends BaseController {
  @httpPut('/', validator(thesisUploadValidator))
  //   @httpPut('/')
  async studentSignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ThesisDTO
  ) {
    try {
    //   const { lecturer_email, thesis_level, file_url, comment = null } = body;
      //  req.file;
      //   const studentDetails = await studentRepo.model.findById(id);
      //   const upload = uploadSingleFile(file);
      const supervisor_details = await lecturerRepo.model.findOne({
        email: body.lecturer_email
      });
      console.log('>>>>>. student_data', req.student_data);
      console.log('>>>>>. student_data', req.student_data.id);

      const thesis_tracking_id = generateId();
      //   const fileUpload = await cloudinaryService.uploadFile(
      //     file_url as unknown as string,
      //     `babcock-thesis`,
      //     'raw',
      //     `${thesis_tracking_id}`
      //   );

      const isMultiSave = Array.isArray(body.thesis_chapter);

      const thesisId = await thesisRepo.create({
        student_id: req.student_data.id,
        file_url: body.lecturer_email,
        thesis_tracking_id,
        lecturer_id: supervisor_details._id,
        thesis_level: body.thesis_level,
        thesis_chapter: isMultiSave
          ? [...body.thesis_chapter]
          : body.thesis_chapter,
        thesis_status: THESIS_STATUS.awaiting_supervisor_review,
        student_upload_time_stamp: new Date(),
        ...(body?.comment && { comment: body.comment }) // Only include if usercomment exists
        // ...(body?.tracker && { tracker: body.tracker }) // Only include if body.tracker exists
      });
      this.handleSuccess(req, res, { id: thesisId._id });
    } catch (error) {
      console.log('>>>> err', error);
      this.handleError(req, res, error);
    }
  }
}

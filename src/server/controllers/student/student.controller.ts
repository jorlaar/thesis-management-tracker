import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  response,
  request,
  httpGet,
  queryParam
} from 'inversify-express-utils';
import studentRepo from '@app/data/student/student.repo';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import { ActionNotAllowedError, NotFoundError } from '../base';
import { PaginationQueryDTO } from '../thesis/thesis.dto';

@controller('/student', authVerify)
export default class StudentController extends BaseController {
  @httpGet('/auth/me')
  async getStudentProfile(@request() req: Request, @response() res: Response) {
    try {
      if (!['student'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findById({
        _id: req.user_data.id
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      this.handleSuccess(req, res, student_details);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/student/profile')
  async getAllAStudentsProfileDetails(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      if (!['student'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne(
        { _id: req.user_data.id },
        { _id: 1 }
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.list({
        conditions: { student: student_details._id },
        sort: { created_at: -1 },
        populate: ['student', 'lecturer', 'methodology'],
        page,
        per_page,
        return_total_pages: true
      });

      this.handleSuccess(req, res, viewThesis);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/get-all') // add rate limit
  async getAllStudent(@request() req: Request, @response() res: Response) {
    const student = await studentRepo.model
      .find({})
      .select('first_name last_name full_name') // include the source fields
      .exec();

    console.log('>>>>>>>. student', student);
    this.handleSuccess(req, res, student);
  }

  // todo: forget-password DONE THOUGH STILL NEED REFINING
  // to for public api do ratelimiting for ip addresses
  // todo: use postman to fetch the reset password token from redis and test the reset password endpoint
  // todo: use postman to run the ratelimiting reset for just incase you can access redis on staging or prod
  // todo: email notification use a free email service like sendgrid or mailgun used resend and nodemailer
  // todo: sms notification
  // todo: 2fa
  // todo: activity log
  // todo: account verification
  // todo: profile update
  // TODO: SIGNEDURL 
  // TODO: USE AWS IN LIEU OF CLOUDINARY
}

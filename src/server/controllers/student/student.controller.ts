import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody,
  httpGet,
  queryParam
} from 'inversify-express-utils';
import {
  changeStudentPassword,
  studentLogin,
  studentSignup
} from './student.validator';
import {
  ChangeStudentPasswordDTO,
  StudentLoginDTO,
  StudentSignupDTO
} from './student.dto';
import studentRepo from '@app/data/student/student.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
import { PaginationQueryDTO } from '../thesis/thesis.dto';
import nodeMailerEmailService from '@app/server/services/email/email.nodemailer.service';

@controller('/student')
export default class StudentController extends BaseController {
  /**
   * signup student
   */
  @httpPost('/', validator(studentSignup))
  async studentSignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: StudentSignupDTO
  ) {
    try {
      const findStudent = await studentRepo.model.findOne({
        email: body.email
      });

      if (findStudent) {
        throw new ControllerError('Student with email already exists');
      }
      const student = await studentRepo.create(body);

      let signedData: object = {
        id: student._id,
        email: student.email,
        department: student.department,
        faculty: student.faculty,
        type: 'student'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      console.log('Student signed up successfully');
      nodeMailerEmailService.sendWelcomeEmail(student.email, student.first_name);
      this.handleSuccess(req, res, { ...signedData, token });
      console.log('Student signed up successfully after sending response');
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/login', validator(studentLogin))
  async studentLogin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: StudentLoginDTO
  ) {
    try {
      const student = await studentRepo.model
        .findOne({ email: body.email })
        .select('+password')
        .exec();

      if (!student) {
        throw new ActionNotAllowedError('Invalid credentials');
      }
      const isPasswordValid = await student.isPasswordValid(body.password);

      if (!isPasswordValid) {
        throw new ControllerError('Invalid password');
      }

      let signedData: object = {
        id: student._id,
        email: student.email,
        department: student.department,
        faculty: student.faculty,
        type: 'student'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      // gets all thesis tied to a student
      const studentPlainDetails = student.toObject();
      delete studentPlainDetails.password;
      delete studentPlainDetails.__v;

      const paginatedThesis = await thesisRepo.list({
        conditions: { student_id: student._id },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        return_total_pages: true,
        sort: { created_at: -1 },
        page: 1,
        per_page: 2
      });

      this.handleSuccess(req, res, {
        ...studentPlainDetails,
        paginatedThesis,
        token
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/auth/me', authVerify)
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

      this.handleSuccess(req, res, { student_details });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/student/profile', authVerify)
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
        conditions: { student_id: student_details._id },
        sort: { created_at: -1 },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        page,
        per_page,
        return_total_pages: true
      });

      this.handleSuccess(req, res, viewThesis);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/change-password', authVerify, validator(changeStudentPassword))
  async changeStudentPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ChangeStudentPasswordDTO
  ) {
    try {
      if (req.user_data.type !== 'student') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      if (body.old_password === body.new_password) {
        throw new BadRequestError(
          'New password must be different from old password'
        );
      }

      const student = await studentRepo.model.findById(
        req.user_data.id,
        '+password'
      );

      if (!student) {
        throw new NotFoundError('student not found');
      }

      const isPasswordValid = await student.isPasswordValid(body.old_password);

      if (!isPasswordValid) {
        throw new ControllerError('Invalid password');
      }

      const updatedStudent = await student.updatePassword(body.new_password);
      await updatedStudent.save();

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  // todo: forget-password
  // todo: email notification use a free email service like sendgrid or mailgun
  // todo: sms notification
  // todo: 2fa
  // todo: activity log
  // todo: account verification
  // todo: profile update
}

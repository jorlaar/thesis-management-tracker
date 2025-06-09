import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody
} from 'inversify-express-utils';
import { studentLogin, studentSignup } from './student.validator';
import { StudentLoginDTO, StudentSignupDTO } from './student.dto';
import studentRepo from '@app/data/student/student.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';

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
      const student = await studentRepo.create(body);

      let signedData = {
        id: student._id,
        email: student.email,
        department: student.department,
        faculty: student.faculty,
        type: 'student'
      };
      const token = await jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: '1d' }
      );
      this.handleSuccess(req, res, { id: student._id, token });
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
      const student = await studentRepo.model.findOne({ email: body.email });
      let signedData = {
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
        { expiresIn: '1d' }
      );
      this.handleSuccess(req, res, { id: student._id, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}

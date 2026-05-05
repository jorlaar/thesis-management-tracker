import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  response,
  request,
  httpGet,
  queryParam
} from 'inversify-express-utils';
import methodologyRepo from '@app/data/methodology/methodology.repo';
import { ActionNotAllowedError, NotFoundError } from '../base';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import { PaginationQueryDTO } from '../thesis/thesis.dto';
import studentRepo from '@app/data/student/student.repo';
import { THESIS_STATUS } from '@app/data/thesis/thesis.model';

@controller('/methodology')
export default class MethodologyController extends BaseController {
  @httpGet('/profile', authVerify)
  async getMethodologyProfile(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const methodology = await methodologyRepo.model.findById(
        req.user_data.id
      );

      if (!methodology) {
        throw new NotFoundError('methodology not found');
      }

      this.handleSuccess(req, res, methodology);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  // add approval status to return only those approved by the lecturer
  @httpGet('/all/thesis', authVerify)
  async methodologygetAllThesisByDepartment(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const allStudentInDept = await studentRepo.model
        .find({
          department: req.user_data.department
        })
        .select('_id')
        .lean();
      console.log('>>>>>> req.user_data.department', req.user_data.department);
      console.log('>>>>>> allStudentInDept', allStudentInDept);
      const studentIds = allStudentInDept.map((student) => student._id);
      console.log('>>>>>> studentIds', studentIds);
      console.log('>>>>>> ...studentIds', [...studentIds]);

      const getMethodologyDetails = await thesisRepo.list({
        conditions: {
          student: { $in: studentIds },
          thesis_status: {
            $in: [
              THESIS_STATUS.approved_by_supervisor,
              THESIS_STATUS.under_methodology_review,
              THESIS_STATUS.revision_requested_by_methodology,
              THESIS_STATUS.approved_by_methodology
            ]
          }
        },
        sort: { created_at: -1 },
        populate: ['student', 'lecturer', 'methodology'],
        page,
        per_page,
        return_total_pages: true
      });
      console.log('>>>>>> getMethodologyDetails', getMethodologyDetails);

      this.handleSuccess(req, res, getMethodologyDetails);
    } catch (error) {
      console.error('>>>>>>> eror', error);
      this.handleError(req, res, error);
    }
  }
}

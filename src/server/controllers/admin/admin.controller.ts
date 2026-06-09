import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  httpGet,
  response,
  request,
  requestParam,
  queryParam
} from 'inversify-express-utils';
import adminRepo from '@app/data/admin/admin.repo';
import studentRepo from '@app/data/student/student.repo';
import thesisRepo from '@app/data/thesis/thesis.repo';
import adminAuthVerify from '@app/server/middlewares/admin.auth.verify';
import { ActionNotAllowedError, NotFoundError } from '../base';
import { PaginationQueryDTO } from '../thesis/thesis.dto';
import { QueryResult } from '@app/data/base';
import { IThesis } from '@app/data/thesis/thesis.model';
import validator from '@app/server/middlewares/validator';
import { PaginationValidator } from '../thesis/thesis.validator';

@controller('/admin', adminAuthVerify)
export default class AdminController extends BaseController {
  @httpGet('/profile')
  async getAdminProfile(@request() req: Request, @response() res: Response) {
    try {
      // if (req.user_data.type !== 'admin') {
      //   throw new ActionNotAllowedError("You can't perform this operation");
      // }

      const admin = await adminRepo.model.findById(req.user_data.id);

      if (!admin) {
        throw new NotFoundError('admin not found');
      }

      this.handleSuccess(req, res, admin);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/:studentEmail/one')
  async adminGetMostRecentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (!['admin'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const viewThesis = await thesisRepo.model
        .findOne({ student: student_details.id })
        .sort({ created_at: -1 });

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/:thesisId/view')
  async adminGetOneThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('thesisId') thesisId: string
  ) {
    try {
      // if (!['admin'].includes(req.user_data.type)) {
      //   throw new ActionNotAllowedError("You can't perform this operation");
      // }

      const thesis_details = await thesisRepo.model.findById(thesisId);
      if (!thesis_details) {
        throw new NotFoundError('Student not found');
      }

      this.handleSuccess(req, res, thesis_details);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/:studentEmail/all')
  async adminGetAllStudentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      // if (req.user_data.type !== 'admin') {
      //   throw new ActionNotAllowedError("You can't perform this operation");
      // }

      const student_details = await studentRepo.model.findOne(
        { email: studentEmail },
        { _id: 1 } // Only fetch the _id field
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
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/all', validator(PaginationValidator, 'query')) // todo add filter by student email, lecturer email, methodology email etc
  async adminGetAllThesis(
    @request() req: Request,
    @response() res: Response,
    // @requestParam('studentEmail') studentEmail: string,
    @queryParam() query: PaginationQueryDTO
  ) {
    let {
      page = 1,
      per_page = 10,
      tracking_id,
      start_date,
      end_date,
      student,
      lecturer,
      methodology,
      search
    } = query;
    try {
      const conditions: any = {};
      if (tracking_id) conditions.tracking_id = tracking_id; // ULID string
      if (student) conditions.student = student; // UUIDv7 string
      if (lecturer) conditions.lecturer = lecturer; // UUIDv7 string
      if (methodology) conditions.methodology = methodology; // UUIDv7 string

      if (start_date || end_date) {
        conditions.created_at = {};
        if (start_date) conditions.created_at.$gte = new Date(start_date);
        if (end_date) {
          const end = new Date(end_date);
          end.setHours(23, 59, 59, 999); // inclusive end date
          conditions.created_at.$lte = end;
        }
      }

      let viewThesis: QueryResult<IThesis>;
      console.log('adminGetAllThesis conditions >>>', conditions);
      if (search) {
        viewThesis = await thesisRepo.searchList({
          conditions,
          search,
          sort: { created_at: -1 },
          page,
          per_page,
          return_total_pages: true
        });
      } else {
        viewThesis = await thesisRepo.list({
          conditions,
          sort: { created_at: -1 },
          populate: ['student', 'lecturer', 'methodology'],
          page,
          per_page,
          return_total_pages: true
        });
      }
      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  // add tracker endpoint for analysis
  @httpGet('/:studentEmail/submission/timetrend')
  async adminGetAllStudentThesisSubmissionTimeTrend(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      // if (req.user_data.type !== 'admin') {
      //   throw new ActionNotAllowedError(
      //     'Unauthorized: Only admin can perform this operation'
      //   );
      // }

      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // Get the most recent thesis for reference (optional)
      const latestThesis = await thesisRepo.model
        .findOne({ student: student_details.id })
        .sort({ created_at: -1 })
        .lean();

      // Aggregate submission time trends FOR THIS SPECIFIC STUDENT
      const submissionTrends = await thesisRepo.model.aggregate([
        {
          $match: {
            student: student_details.id,
            student_upload_time_stamp: { $exists: true }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m', // Group by year-month
                date: '$student_upload_time_stamp'
              }
            },
            count: { $sum: 1 },
            // Optional: include tracking IDs
            tracking_ids: { $push: '$thesis_tracking_id' }
          }
        },
        { $sort: { _id: 1 } } // Sort chronologically
      ]);

      //  Handle response
      if (!submissionTrends || submissionTrends.length === 0) {
        return this.handleSuccess(req, res, {
          message: 'No thesis submissions found for this student',
          data: {
            trends: [],
            latest_thesis: latestThesis || null
          }
        });
      }
      this.handleSuccess(req, res, {
        data: {
          trends: submissionTrends,
          latest_thesis: latestThesis || null,
          student_info: {
            id: student_details.id,
            email: student_details.email
            // Add other relevant student fields
          }
        }
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/lifecycle/:trackingId')
  async getAThesisLifeCycle(
    @request() req: Request,
    @response() res: Response,
    @requestParam('trackingId') trackingId: string,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      // if (req.user_data.type !== 'admin') {
      //   throw new ActionNotAllowedError("You can't perform this operation");
      // }

      // const query = {
      //   thesis_tracking_id: trackingId
      // };

      const viewThesis = await thesisRepo.list({
        conditions: { thesis_tracking_id: trackingId },
        sort: { created_at: -1 },
        populate: ['student_id', 'lecturer_id', 'methodology_id'], // (if i can manipulate this to student, lecturer, methoddology without changing it)
        page,
        per_page,
        return_total_pages: true
      });

      // console.log('viewThesis >>>>', viewThesis);
      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/get-all') // add rate limit
  async getAllAdmin(@request() req: Request, @response() res: Response) {
    const admin = await adminRepo.model
      .find({})
      .select('first_name last_name full_name') // include the source fields
      .exec();

    // console.log('>>>>>>>. admin', admin);
    this.handleSuccess(req, res, admin);
  }
}

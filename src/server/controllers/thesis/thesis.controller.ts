import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import { fileAndBodyValidator } from '@app/server/middlewares/validator';
import {
  controller,
  response,
  request,
  requestBody,
  httpPut,
  httpGet,
  requestParam,
  queryParam
} from 'inversify-express-utils';
import {
  lecturerUploadCommentValidator,
  methodologyUploadCommentValidator,
  studentUploadThesisValidator
} from './thesis.validator';
import {
  lecturerCommentUpload,
  methodologyCommentUpload,
  PaginationQueryDTO,
  ThesisDTO,
  ThesisQuery
} from './thesis.dto';
import authVerify from '@app/server/middlewares/auth.verify';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import { generateUlid } from '@app/server/utils';
import thesisRepo from '@app/data/thesis/thesis.repo';
import { THESIS_STATUS } from '@app/data/thesis/thesis.model';
import studentRepo from '@app/data/student/student.repo';
// import methodologyRepo from '@app/data/methodology/methodology.repo';
import { ActionNotAllowedError, BadRequestError, NotFoundError } from '../base';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import upload from '@app/server/middlewares/multerConfig';
import {
  ThesisSupportedContentType,
  ThesisSupportedContentTypes
} from '@app/server/services/s3/s3.type';
import cloudinaryService from '@app/server/services/cloudinary/cloudinary.service';
import { generateCsvFile } from '@app/server/factories/export-csv';
import env from '@app/common/config/env';

@controller('/thesis', authVerify)
export default class ThesisController extends BaseController {
  @httpPut(
    '/student',
    upload.single('file'),
    fileAndBodyValidator(studentUploadThesisValidator)
  )
  async studentUploadThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ThesisDTO
  ) {
    try {
      console.log(">>>>>>>> file_url", req.file);
      console.log(">>>>>>>> body", body);
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'student') {
        throw new ActionNotAllowedError(
          'Only a student can access to perform this operation'
        );
      }

      const supervisor_details = await lecturerRepo.model.findOne({
        id: body.lecturer
      });

      if (!supervisor_details) {
        throw new NotFoundError('Supervisor not found');
      }

      const thesis_tracking_id = generateUlid();
      const thesis_saving_id = generateUlid();
      req.body.otherField;

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      // const isMultiSave = Array.isArray(body.thesis_chapter);

      const thesisDetails = await thesisRepo.create({
        student: req.user_data.id,
        file_url: fileUpload.secure_url,
        thesis_tracking_id,
        lecturer: supervisor_details._id,
        thesis_level: body.thesis_level,
        thesis_title: body.thesis_title,
        // thesis_chapter: isMultiSave
        //   ? [...body.thesis_chapter]
        //   : body.thesis_chapter,
        thesis_chapter: body.thesis_chapter,
        thesis_status: THESIS_STATUS.awaiting_supervisor_review,
        student_upload_time_stamp: new Date(),
        ...(body?.comment && { comment: body.comment }) // Only include if usercomment exists
        // ...(body?.tracker && { tracker: body.tracker }) // Only include if body.tracker exists
      });

      console.log('thesisDetails >>>>', thesisDetails);

      this.handleSuccess(req, res, { id: thesisDetails._id });
    } catch (error) {
      console.log('req, res, ', error);
      this.handleError(req, res, error);
    }
  }

  @httpGet('/lecturer/:studentEmail/one/:thesisId')
  async lecturerGetOneThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string,
    @requestParam('thesisId') thesisId: string
  ) {
    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }
      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const query = {
        _id: thesisId
      };

      const viewThesis = await thesisRepo.model.findOne(query);

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/lecturer/:studentEmail/latest/student')
  async lecturerGetMostRecentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }
      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const query: ThesisQuery = {
        student: student_details.id,
        lecturer: req.user_data.id
      };

      const viewThesis = await thesisRepo.model
        .findOne(query)
        .sort({ created_at: -1 });

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/lecturer/:studentEmail')
  async lecturerGetAllStudentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne(
        { email: studentEmail },
        { _id: 1 } // Only fetch the _id field
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // const thesis_details_one = await thesisRepo.model.findById(
      //   student_details._id
      // );

      // const viewThesis = await thesisRepo.model.find(
      //   { student: student_details._id },
      //   null, // Return all fields
      //   { sort: { created_at: -1 } } // Sort by most recent first
      // );

      // if (!viewThesis || viewThesis.length === 0) {
      //   return this.handleSuccess(req, res, {
      //     message: 'No thesis documents found for this student',
      //     viewThesis: []
      //   });
      // }

      const viewThesis = await thesisRepo.list({
        conditions: { student: student_details._id },
        sort: { created_at: -1 },
        populate: ['student', 'lecturer', 'methodology'],
        page,
        per_page,
        return_total_pages: true
      });

      console.log('viewThesis >>>>', viewThesis);

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      console.log('error >>>>', error);

      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/review',
    fileAndBodyValidator(lecturerUploadCommentValidator)
  )
  async lecturerUploadThesisComment(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          lecturer: req.user_data.id
        })
        .sort({ created_at: 1 });

      const thesis_saving_id = generateUlid();
      req.body.otherField;

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesis = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        thesis_status: THESIS_STATUS.under_supervisor_review,
        lecturer_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url
      });

      emailNodemailerService.sendLecturerThesisReviewEmail(
        student_details.email,
        student_details.first_name,
        `${req.user_data.first_name} ${req.user_data.last_name}`
      );

      this.handleSuccess(req, res, { id: thesis._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/approve',
    fileAndBodyValidator(lecturerUploadCommentValidator)
  )
  async lecturerApproveThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          lecturer: req.user_data.id
        })
        .sort({ created_at: 1 });

      const thesis_saving_id = generateUlid();
      // req.body.otherField;

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesisId = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        thesis_status: THESIS_STATUS.approved_by_supervisor,
        lecturer_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url // Only include if usercomment exists
      });

      emailNodemailerService.sendLecturerThesisApprovalEmail(
        student_details.email,
        student_details.first_name,
        `${req.user_data.first_name} ${req.user_data.last_name}`
      );

      this.handleSuccess(req, res, { id: thesisId._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/reject',
    fileAndBodyValidator(lecturerUploadCommentValidator)
  )
  async lecturerRejectThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          lecturer: req.user_data.id
        })
        .sort({ created_at: 1 });

      const thesis_saving_id = generateUlid();
      req.body.otherField;

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesisDetails = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        thesis_status: THESIS_STATUS.rejected_by_supervisor,
        lecturer_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url
      });

      emailNodemailerService.sendThesisLecturerRejectionEmail(
        student_details.email,
        student_details.first_name,
        req.user_data.email,
        `${req.user_data.first_name} ${req.user_data.last_name}`,
        body?.comment,
        thesisDetails.file_url
      );

      this.handleSuccess(req, res, { id: thesisDetails._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/methodology/:studentEmail') // how do i handle getting all thesis
  async methodologyGetAllStudentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne(
        { email: studentEmail },
        { _id: 1 } // Only fetch the _id field
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // const thesis_details_one = await thesisRepo.model.findById(
      //   student_details._id
      // );

      const viewThesis = await thesisRepo.model.find(
        { student: student_details._id },
        null, // Return all fields
        { sort: { created_at: -1 } } // Sort by most recent first
      );

      if (!viewThesis || viewThesis.length === 0) {
        return this.handleSuccess(req, res, {
          message: 'No thesis documents found for this student',
          viewThesis: []
        });
      }
      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/methodology/:studentEmail/latest/student')
  async methodologyGetMostRecentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const query: ThesisQuery = {
        student: student_details.id,
        methodology: req.user_data.id
      };

      const viewThesis = await thesisRepo.model
        .findOne(query)
        .sort({ created_at: -1 });

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/methodology/:studentEmail/one/:thesisId')
  async methodologyGetOneThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string,
    @requestParam('thesisId') thesisId: string
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }
      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const query = {
        _id: thesisId
      };

      const viewThesis = await thesisRepo.model.findOne(query);

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/methodology/review',
    fileAndBodyValidator(methodologyUploadCommentValidator)
  )
  async methodologyUploadThesisComment(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }

      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          thesis_status: THESIS_STATUS.approved_by_supervisor
        })
        .sort({ created_at: 1 });

      if (!viewThesis) {
        throw new BadRequestError(
          "Thesis is still awaiting supervisor's approval"
        );
      }

      const thesis_saving_id = generateUlid();

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesisId = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.under_methodology_review,
        methodology_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url
        // ...(body?.file_url && { file_url: body.file_url }) // Only include if usercomment exists
        // ...(body?.tracker && { tracker: body.tracker }) // Only include if body.tracker exists
      });

      emailNodemailerService.sendMethodologyThesisReviewEmail(
        student_details.email,
        student_details.first_name,
        `${req.user_data.first_name} ${req.user_data.last_name}`
      );

      this.handleSuccess(req, res, { id: thesisId._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/methodology/approve',
    fileAndBodyValidator(methodologyUploadCommentValidator)
  )
  async methodologyApproveThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }
      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          thesis_status: THESIS_STATUS.approved_by_supervisor
        })
        .sort({ created_at: 1 });

      const thesis_saving_id = generateUlid();

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesisId = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        methodology: req.user_data.id,
        thesis_status: THESIS_STATUS.approved_by_methodology,
        methodology_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url
        // ...(body?.file_url && { file_url: body.file_url }) // Only include if usercomment exists
      });

      emailNodemailerService.sendMethodologyThesisApprovalEmail(
        student_details.email,
        student_details.first_name,
        `${req.user_data.first_name} ${req.user_data.last_name}`
      );

      this.handleSuccess(req, res, { id: thesisId._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/methodology/reject',
    fileAndBodyValidator(methodologyUploadCommentValidator)
  )
  async methodologyRejectThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyCommentUpload
  ) {
    try {
      const { fieldname, mimetype } = req.file;

      if (
        ![...ThesisSupportedContentTypes].includes(
          mimetype as ThesisSupportedContentType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }

      const student_details = await studentRepo.model.findOne({
        email: body.student_email
      });

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id,
          thesis_status: THESIS_STATUS.approved_by_supervisor
        })
        .sort({ created_at: 1 });

      const thesis_saving_id = generateUlid();
      req.body.otherField;

      const fileUpload = await cloudinaryService.uploadFile(
        fieldname as string,
        env.cloudinary_bucket,
        env.cloudinary_datatype,
        `${thesis_saving_id}`
      );

      const thesisDetails = await thesisRepo.create({
        student: student_details._id,
        comment: body.comment,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        methodology: req.user_data.id,
        thesis_status: THESIS_STATUS.rejected_by_methodology,
        methodology_review_time_stamp: new Date(),
        file_url: fileUpload.secure_url
      });

      emailNodemailerService.sendThesisMethodologyRejectionEmail(
        student_details.email,
        student_details.first_name,
        req.user_data.email,
        `${req.user_data.first_name} ${req.user_data.last_name}`,
        body?.comment,
        thesisDetails.file_url
      );

      this.handleSuccess(req, res, { id: thesisDetails._id });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/csv-export')
  async exportCsvDocs(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    if (req.user_data.type !== 'admin') {
      throw new ActionNotAllowedError(
        'Only an Admin can perform this operation'
      );
    }
    this.handleFileResponse(req, res, async (res) => {
      const { page, per_page } = query;

      const viewThesis = await thesisRepo.list({
        conditions: {},
        sort: { created_at: -1 },
        populate: ['student', 'lecturer', 'methodology'],
        page,
        per_page,
        return_total_pages: true
      });
      console.log('>>>>>>>>>> viewThesis', viewThesis);

      const csvFile = await generateCsvFile(res, viewThesis.result);

      console.log('>>>>>>>>>> csvFile', csvFile);
    });
  }
}

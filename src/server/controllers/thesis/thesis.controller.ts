import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator, {
  fileAndBodyValidator
} from '@app/server/middlewares/validator';
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
  lecturerUploadReviewValidator,
  methodologyUploadCommentValidator,
  methodologyUploadReviewValidator,
  PaginationValidator,
  studentUploadThesisValidator
} from './thesis.validator';
import {
  lecturerCommentUpload,
  lecturerReviewUpload,
  methodologyCommentUpload,
  methodologyReviewUpload,
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
import methodologyRepo from '@app/data/methodology/methodology.repo';
import { ActionNotAllowedError, BadRequestError, NotFoundError } from '../base';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import { upload } from '@app/server/middlewares/multerConfig';
import {
  ThesisSupportedMimeType,
  ThesisSupportedMimeTypes
} from '@app/server/services/s3/s3.type';
// import cloudinaryService from '@app/server/services/cloudinary/cloudinary.service';
import {
  // generateCsvFile,
  generateCsvStream
} from '@app/server/factories/export-csv';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';
import s3Service from '@app/server/services/s3/s3.service';

@controller('/thesis', authVerify)
export default class ThesisController extends BaseController {
  @httpPut(
    '/student',
    upload,
    fileAndBodyValidator(studentUploadThesisValidator)
  )
  async studentUploadThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ThesisDTO
  ) {
    try {
      console.log('>>>>>>>> req.file', req.file);
      console.log('>>>>>>>> body', body);
      const { buffer, mimetype } = req.file;

      if (
        ![...ThesisSupportedMimeTypes].includes(
          mimetype as ThesisSupportedMimeType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'student') {
        throw new ActionNotAllowedError(
          'Only a student can access to perform this operation'
        );
      }

      const supervisor_details = await lecturerRepo.model.findById(
        body.lecturer
      );

      if (!supervisor_details) {
        throw new NotFoundError('Lecturer not found');
      }

      const student_details = await studentRepo.model.findById(
        req.user_data.id
      );

      // on approval by supervisor get all the methodology for that dept and randomly select one and assign to the project then track going forward

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // use the latest upload to track the thesis status and details
      const viewThesis = await thesisRepo.model
        .findOne({
          student: student_details.id
        })
        .sort({ created_at: -1 });

      if (!viewThesis) {
        const thesis_saving_id = generateUlid();

        // const fileUpload = await cloudinaryService.uploadFile(
        //   fieldname as string,
        //   env.cloudinary_bucket,
        //   env.cloudinary_datatype,
        //   `${thesis_saving_id}`
        // );

        const awsFileUpload = await s3Service.uploadFile(
          env.thesis_bucket,
          mimetype as ThesisSupportedMimeType,
          buffer,
          `${body.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
        );

        const thesisDetails = await thesisRepo.create({
          student: req.user_data.id,
          file_url: awsFileUpload.Key,
          thesis_tracking_id: generateUlid(),
          lecturer: supervisor_details._id,
          ...(body?.thesis_level && { thesis_level: body.thesis_level }),
          thesis_title: body.thesis_title,
          // thesis_chapter: isMultiSave
          //   ? [...body.thesis_chapter]
          //   : body.thesis_chapter,
          // thesis_chapter: body?.thesis_chapter || THESIS_CHAPTER.ONE,
          ...(body?.thesis_chapter && { thesis_chapter: body?.thesis_chapter }),
          thesis_status: THESIS_STATUS.awaiting_supervisor_review,
          student_upload_time_stamp: new Date(),
          ...(body?.comment && { comment: body.comment }) // Only include if usercomment exists
        });

        return this.handleSuccess(req, res, thesisDetails);
      }

      const getOldestRecord = await thesisRepo.model
        .findOne({
          student: student_details.id
        })
        .sort({ created_at: 1 })
        .select('lecturer thesis_tracking_id');

      const thesisWithMethodology = await thesisRepo.model
        .findOne({
          student: student_details.id,
          methodology: { $ne: null, $exists: true }
        })
        .sort({ created_at: -1 })
        .select('methodology');

      const DISALLOWED_UPLOAD_STATUSES = [
        // THESIS_STATUS.rejected_by_supervisor,
        // THESIS_STATUS.rejected_by_methodology,
        // THESIS_STATUS.revision_requested_by_supervisor,
        // THESIS_STATUS.revision_requested_by_methodology
        THESIS_STATUS.awaiting_supervisor_review,
        THESIS_STATUS.awaiting_methodology_review
      ];

      if (DISALLOWED_UPLOAD_STATUSES.includes(viewThesis.thesis_status)) {
        // console.log(
        //   'got here viewThesis.thesis_status',
        //   viewThesis.thesis_status
        // );
        throw new ActionNotAllowedError(
          "Your thesis is actively under review and you can't upload"
        );
      }

      if (viewThesis.thesis_status === THESIS_STATUS.approved_by_methodology) {
        throw new ActionNotAllowedError('Thesis has been give final approval');
      }

      if (viewThesis.thesis_status === THESIS_STATUS.approved_by_supervisor) {
        throw new ActionNotAllowedError(
          'Thesis is awaiting methodology review'
        );
      }

      let thesis_status: string;

      switch (viewThesis.thesis_status) {
        case THESIS_STATUS.rejected_by_supervisor:
        case THESIS_STATUS.revision_requested_by_supervisor:
          thesis_status = THESIS_STATUS.awaiting_supervisor_review;
          break;
        case THESIS_STATUS.rejected_by_methodology:
        case THESIS_STATUS.revision_requested_by_methodology:
          thesis_status = THESIS_STATUS.awaiting_methodology_review;
          break;
        default:
          thesis_status = THESIS_STATUS.awaiting_supervisor_review;
      }

      const thesis_saving_id = generateUlid();
      // req.body.otherField;

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      const awsFileUpload = await s3Service.uploadFile(
        env.thesis_bucket,
        mimetype as ThesisSupportedMimeType,
        buffer,
        `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
        // `${viewThesis.thesis_title}/${thesis_saving_id}`
      );

      // const isMultiSave = Array.isArray(body.thesis_chapter);

      const thesisDetails = await thesisRepo.create({
        student: req.user_data.id,
        file_url: awsFileUpload.Key,
        thesis_tracking_id: getOldestRecord.thesis_tracking_id,
        lecturer: getOldestRecord.lecturer,
        methodology: thesisWithMethodology?.methodology,
        ...(body?.thesis_level && { thesis_level: body.thesis_level }),
        thesis_title: viewThesis.thesis_title,
        // thesis_chapter: isMultiSave
        //   ? [...body.thesis_chapter]
        //   : body.thesis_chapter,
        // thesis_chapter: body?.thesis_chapter || THESIS_CHAPTER.ONE,
        ...(body?.thesis_chapter && { thesis_chapter: body?.thesis_chapter }),
        thesis_status,
        student_upload_time_stamp: new Date(),
        ...(body?.comment && { comment: body.comment }) // Only include if usercomment exists
      });

      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
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

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/all/lecturer', validator(PaginationValidator, 'query'))
  async getAllLecturerThesis(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    let {
      page = 1,
      per_page = 10,
      tracking_id,
      start_date,
      end_date,
      student,
      methodology
    } = query;

    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const conditions: any = { lecturer: req.user_data.id };
      if (tracking_id) conditions.tracking_id = tracking_id; // ULID string
      if (student) conditions.student = student; // UUIDv7 string
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

      const viewThesis = await thesisRepo.list({
        conditions,
        sort: { created_at: -1 },
        populate: ['student', 'lecturer'],
        page,
        per_page,
        return_total_pages: true
      });

      this.handleSuccess(req, res, viewThesis);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/review',
    upload,
    fileAndBodyValidator(lecturerUploadReviewValidator)
  )
  async lecturerUploadThesisComment(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerReviewUpload
  ) {
    try {
      const { buffer, mimetype } = req.file;

      if (
        ![...ThesisSupportedMimeTypes].includes(
          mimetype as ThesisSupportedMimeType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      const student_details = await studentRepo.model.findById(body.student);

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     lecturer: req.user_data.id,
      //     thesis_status: THESIS_STATUS.awaiting_supervisor_review
      //   })
      //   .sort({ created_at: -1 });
      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new ActionNotAllowedError(
          'No thesis awaiting lecturer review for this student'
        );
      }

      if (
        viewThesis.thesis_status !== THESIS_STATUS.awaiting_supervisor_review
      ) {
        throw new ActionNotAllowedError('This thesis is not ready for review');
      }

      const lecturer_details = await lecturerRepo.model.findById(
        req.user_data.id
      );

      if (!lecturer_details) {
        throw new NotFoundError('Lecturer not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_supervisor
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${lecturer_details.first_name} ${lecturer_details.last_name}`
        );
      }

      const thesis_saving_id = generateUlid();
      // req.body.otherField;

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      const awsFileUpload = await s3Service.uploadFile(
        env.thesis_bucket,
        mimetype as ThesisSupportedMimeType,
        buffer,
        `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
        // `${viewThesis.thesis_title}/${thesis_saving_id}`
      );

      const thesisDetails = await thesisRepo.create({
        student: student_details._id,
        ...(body?.comment && { comment: body.comment }),
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        thesis_title: viewThesis.thesis_title,
        thesis_status: THESIS_STATUS.revision_requested_by_supervisor,
        lecturer_review_time_stamp: new Date(),
        file_url: awsFileUpload.Key
      });

      try {
        emailNodemailerService.sendLecturerThesisReviewEmail(
          student_details.email,
          student_details.first_name,
          `${req.user_data.first_name} ${req.user_data.last_name}`
        );
      } catch (err) {
        logger.error(err, 'error with lecturer thesis review');
      }

      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/approve',
    upload,
    fileAndBodyValidator(lecturerUploadCommentValidator)
  )
  async lecturerApproveThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerCommentUpload
  ) {
    try {
      // const { buffer, mimetype } = req.file;

      // if (
      //   ![...ThesisSupportedMimeTypes].includes(
      //     mimetype as ThesisSupportedMimeType
      //   )
      // ) {
      //   throw new ActionNotAllowedError('Unsupported content type');
      // }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     lecturer: req.user_data.id,
      //     thesis_status: THESIS_STATUS.awaiting_supervisor_review
      //   })
      //   .sort({ created_at: -1 });
      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new ActionNotAllowedError(
          'No thesis awaiting your approval for this student'
        );
      }

      if (
        viewThesis.thesis_status !== THESIS_STATUS.awaiting_supervisor_review
      ) {
        throw new ActionNotAllowedError(
          'This thesis is not awaiting your approval'
        );
      }

      const student_details = await studentRepo.model.findById(
        viewThesis.student
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const lecturer_details = await lecturerRepo.model.findById(
        req.user_data.id
      );

      if (!lecturer_details) {
        throw new NotFoundError('Lecturer not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_supervisor
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${lecturer_details.first_name} ${lecturer_details.last_name}`
        );
      }

      // const thesis_saving_id = generateUlid();
      // req.body.otherField;

      const getMethodologyForThesis = await methodologyRepo.all({
        conditions: { department: req.user_data.department },
        projections: { _id: 1 }
      });

      if (getMethodologyForThesis.length === 0) {
        throw new Error(
          'No methodology reviewers available in your department'
        );
      }

      // algorithm to assign a methodology to the approve thesis
      const methodologyToAssign =
        getMethodologyForThesis[
          Math.floor(Math.random() * getMethodologyForThesis.length)
        ];

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      // const awsFileUpload = await s3Service.uploadFile(
      //   env.thesis_bucket,
      //   mimetype as ThesisSupportedMimeType,
      //   buffer,
      //   `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
      // );

      const thesisDetails = await thesisRepo.create({
        student: viewThesis.student,
        ...(body?.comment && { comment: body.comment }),
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        methodology: methodologyToAssign, // using algorithm to assign a methodology to the approve thesis
        thesis_title: viewThesis.thesis_title,
        thesis_status: THESIS_STATUS.approved_by_supervisor,
        lecturer_review_time_stamp: new Date(),
        file_url: viewThesis?.file_url // Only include if usercomment exists
      });

      try {
        emailNodemailerService.sendLecturerThesisApprovalEmail(
          student_details?.email,
          student_details?.first_name,
          `${req.user_data?.first_name} ${req.user_data?.last_name}`
        );
      } catch (err) {
        logger.error(err, 'error sending email');
      }

      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
      console.log('>>>>>> nerr', error);
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/lecturer/reject',
    upload,
    fileAndBodyValidator(lecturerUploadCommentValidator)
  )
  async lecturerRejectThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: lecturerCommentUpload
  ) {
    try {
      // const { buffer, mimetype } = req.file;

      // if (
      //   ![...ThesisSupportedMimeTypes].includes(
      //     mimetype as ThesisSupportedMimeType
      //   )
      // ) {
      //   throw new ActionNotAllowedError('Unsupported content type');
      // }

      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError(
          'Only a lecturer can access to perform this operation'
        );
      }

      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     lecturer: req.user_data.id,
      //     thesis_status: THESIS_STATUS.awaiting_supervisor_review
      //   })
      //   .sort({ created_at: -1 });

      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new ActionNotAllowedError(
          'No thesis awaiting lecturer review for this student'
        );
      }

      if (
        viewThesis.thesis_status !== THESIS_STATUS.awaiting_supervisor_review
      ) {
        throw new ActionNotAllowedError('This thesis is not ready for review');
      }

      // const thesis_saving_id = generateUlid();
      // req.body.otherField;

      const student_details = await studentRepo.model.findById(
        viewThesis.student
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const lecturer_details = await lecturerRepo.model.findById(
        req.user_data.id
      );

      if (!lecturer_details) {
        throw new NotFoundError('Lecturer not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_supervisor
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${lecturer_details.first_name} ${lecturer_details.last_name}`
        );
      }

      // not needed yet this validation was to handle cases of other status
      // const getSetOfStatusForReview = await thesisRepo.model.find({
      //    thesis_tracking_id: viewThesis.thesis_tracking_id
      // });

      // getSetOfStatusForReview.find((each) =>  each.thesis_status === THESIS_STATUS. )

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      // const awsFileUpload = await s3Service.uploadFile(
      //   env.thesis_bucket,
      //   mimetype as ThesisSupportedMimeType,
      //   buffer,
      //   `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
      // );

      const thesisDetails = await thesisRepo.create({
        student: viewThesis.student,
        ...(body?.comment && { comment: body.comment }),
        thesis_title: viewThesis.thesis_title,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        lecturer: req.user_data.id,
        thesis_status: THESIS_STATUS.rejected_by_supervisor,
        lecturer_review_time_stamp: new Date(),
        file_url: viewThesis.file_url
      });

      emailNodemailerService.sendThesisLecturerRejectionEmail(
        student_details.email,
        student_details.first_name,
        req.user_data.email,
        `${req.user_data.first_name} ${req.user_data.last_name}`,
        body?.comment,
        thesisDetails.file_url
      );

      this.handleSuccess(req, res, thesisDetails);
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

  @httpGet('/all/methodology', validator(PaginationValidator, 'query'))
  async getAllMethodologyThesis(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    let {
      page = 1,
      per_page = 10,
      tracking_id,
      start_date,
      end_date,
      student,
      lecturer
    } = query;

    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const conditions: any = { methodology: req.user_data.id };
      if (tracking_id) conditions.tracking_id = tracking_id; // ULID string
      if (student) conditions.student = student; // UUIDv7 string
      if (lecturer) conditions.lecturer = lecturer; // UUIDv7 string

      if (start_date || end_date) {
        conditions.created_at = {};
        if (start_date) conditions.created_at.$gte = new Date(start_date);
        if (end_date) {
          const end = new Date(end_date);
          end.setHours(23, 59, 59, 999); // inclusive end date
          conditions.created_at.$lte = end;
        }
      }

      const viewThesis = await thesisRepo.list({
        // conditions: {
        //   methodology: req.user_data.id
        //   // thesis_status: {
        //   //   $in: [
        //   //     THESIS_STATUS.approved_by_supervisor,
        //   //     THESIS_STATUS.rejected_by_methodology,
        //   //     THESIS_STATUS.revision_requested_by_methodology,
        //   //     THESIS_STATUS.approved_by_methodology
        //   //   ]
        //   // }
        // },
        conditions,
        sort: { created_at: -1 },
        populate: ['student', 'lecturer', 'methodology'],
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

  @httpPut(
    '/methodology/review',
    upload,
    fileAndBodyValidator(methodologyUploadReviewValidator)
  )
  async methodologyUploadThesisComment(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyReviewUpload
  ) {
    try {
      const { buffer, mimetype } = req.file;

      if (
        ![...ThesisSupportedMimeTypes].includes(
          mimetype as ThesisSupportedMimeType
        )
      ) {
        throw new ActionNotAllowedError('Unsupported content type');
      }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }

      const student_details = await studentRepo.model.findById(body.student);

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     methodology: req.user_data.id,
      //     thesis_status: THESIS_STATUS.approved_by_supervisor
      //   })
      //   .sort({ created_at: -1 });

      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new BadRequestError("No Thesis for methodology's review");
      }

      // if (
      //   viewThesis.thesis_status !== THESIS_STATUS.approved_by_supervisor &&
      //   viewThesis.thesis_status !== THESIS_STATUS.awaiting_methodology_review
      // ) {
      //   throw new ActionNotAllowedError(
      //     'This thesis is not ready for review'
      //   );
      // }
      const validStatusesForReview = [
        THESIS_STATUS.approved_by_supervisor,
        THESIS_STATUS.awaiting_methodology_review
      ];
      if (!validStatusesForReview.includes(viewThesis.thesis_status)) {
        throw new ActionNotAllowedError('This thesis is not ready for review');
      }

      const methodology_details = await methodologyRepo.model.findById(
        req.user_data.id
      );

      if (!methodology_details) {
        throw new NotFoundError('Methodology not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_methodology
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${methodology_details.first_name} ${methodology_details.last_name}`
        );
      }

      const thesis_saving_id = generateUlid();

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      const awsFileUpload = await s3Service.uploadFile(
        env.thesis_bucket,
        mimetype as ThesisSupportedMimeType,
        buffer,
        `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
      );

      const thesisDetails = await thesisRepo.create({
        student: student_details._id,
        ...(body?.comment && { comment: body.comment }),
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.revision_requested_by_methodology,
        methodology_review_time_stamp: new Date(),
        thesis_title: viewThesis.thesis_title,
        file_url: awsFileUpload.Key,
        methodology: req.user_data.id

        // ...(body?.file_url && { file_url: body.file_url }) // Only include if usercomment exists
        // ...(body?.tracker && { tracker: body.tracker }) // Only include if body.tracker exists
      });

      try {
        emailNodemailerService.sendMethodologyThesisReviewEmail(
          student_details.email,
          student_details.first_name,
          `${req.user_data.first_name} ${req.user_data.last_name}`
        );
      } catch (err) {
        logger.error(err, 'error sending email');
      }
      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/methodology/approve',
    upload,
    fileAndBodyValidator(methodologyUploadCommentValidator)
  )
  async methodologyApproveThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyCommentUpload
  ) {
    try {
      // const { buffer, mimetype } = req.file;

      // if (
      //   ![...ThesisSupportedMimeTypes].includes(
      //     mimetype as ThesisSupportedMimeType
      //   )
      // ) {
      //   throw new ActionNotAllowedError('Unsupported content type');
      // }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }

      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     methodology: req.user_data.id,
      //     thesis_status: THESIS_STATUS.approved_by_supervisor
      //   })
      //   .sort({ created_at: -1 });

      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new ActionNotAllowedError(
          'No thesis awaiting your methodology approval for this student'
        );
      }

      const validStatusesForReview = [
        THESIS_STATUS.approved_by_supervisor,
        THESIS_STATUS.awaiting_methodology_review
      ];
      if (!validStatusesForReview.includes(viewThesis.thesis_status)) {
        throw new ActionNotAllowedError('This thesis is not ready for review');
      }

      const student_details = await studentRepo.model.findById(
        viewThesis.student
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const methodology_details = await methodologyRepo.model.findById(
        req.user_data.id
      );

      if (!methodology_details) {
        throw new NotFoundError('Methodology not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_methodology
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${methodology_details.first_name} ${methodology_details.last_name}`
        );
      }

      // const thesis_saving_id = generateUlid();

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      // const awsFileUpload = await s3Service.uploadFile(
      //   env.thesis_bucket,
      //   mimetype as ThesisSupportedMimeType,
      //   buffer,
      //   `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
      // );

      const thesisDetails = await thesisRepo.create({
        student: viewThesis.student,
        ...(body?.comment && { comment: body.comment }),
        thesis_title: viewThesis.thesis_title,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        methodology: req.user_data.id,
        thesis_status: THESIS_STATUS.approved_by_methodology,
        methodology_review_time_stamp: new Date(),
        file_url: viewThesis.file_url
        // ...(body?.file_url && { file_url: body.file_url }) // Only include if usercomment exists
      });

      try {
        emailNodemailerService.sendMethodologyThesisApprovalEmail(
          student_details.email,
          student_details?.first_name,
          `${req.user_data?.first_name} ${req.user_data?.last_name}`
        );
      } catch (err) {
        logger.error(err, 'error sending email');
      }
      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpPut(
    '/methodology/reject',
    upload,
    fileAndBodyValidator(methodologyUploadCommentValidator)
  )
  async methodologyRejectThesis(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: methodologyCommentUpload
  ) {
    try {
      // const { buffer, mimetype } = req.file;

      // if (
      //   ![...ThesisSupportedMimeTypes].includes(
      //     mimetype as ThesisSupportedMimeType
      //   )
      // ) {
      //   throw new ActionNotAllowedError('Unsupported content type');
      // }

      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError(
          'Only a methodology can perform this operation'
        );
      }

      // const viewThesis = await thesisRepo.model
      //   .findOne({
      //     student: student_details.id,
      //     methodology: req.user_data.id,
      //     thesis_status: THESIS_STATUS.approved_by_supervisor
      //   })
      //   .sort({ created_at: -1 });
      const viewThesis = await thesisRepo.model.findById(body.thesis_id);

      if (!viewThesis) {
        throw new ActionNotAllowedError(
          'No thesis awaiting methodology review for this student'
        );
      }

      const validStatusesForReview = [
        THESIS_STATUS.approved_by_supervisor,
        THESIS_STATUS.awaiting_methodology_review
      ];
      if (!validStatusesForReview.includes(viewThesis.thesis_status)) {
        throw new ActionNotAllowedError('This thesis is not ready for review');
      }

      // const thesis_saving_id = generateUlid();
      // req.body.otherField;

      const student_details = await studentRepo.model.findById(
        viewThesis.student
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const methodology_details = await methodologyRepo.model.findById(
        req.user_data.id
      );

      if (!methodology_details) {
        throw new NotFoundError('Methodology not found');
      }

      const getApprovalStatus = await thesisRepo.model.findOne({
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        thesis_status: THESIS_STATUS.approved_by_methodology
      });

      if (getApprovalStatus) {
        throw new ActionNotAllowedError(
          `This thesis has already been approved by ${methodology_details.first_name} ${methodology_details.last_name}`
        );
      }

      // const fileUpload = await cloudinaryService.uploadFile(
      //   fieldname as string,
      //   env.cloudinary_bucket,
      //   env.cloudinary_datatype,
      //   `${thesis_saving_id}`
      // );

      // const awsFileUpload = await s3Service.uploadFile(
      //   env.thesis_bucket,
      //   mimetype as ThesisSupportedMimeType,
      //   buffer,
      //   `${viewThesis.thesis_title.replace(/ /g, '_')}/${thesis_saving_id}`
      // );

      const thesisDetails = await thesisRepo.create({
        student: viewThesis.student,
        ...(body?.comment && { comment: body.comment }),
        thesis_title: viewThesis.thesis_title,
        thesis_tracking_id: viewThesis.thesis_tracking_id,
        methodology: req.user_data.id,
        thesis_status: THESIS_STATUS.rejected_by_methodology,
        methodology_review_time_stamp: new Date(),
        file_url: viewThesis.file_url
      });

      try {
        emailNodemailerService.sendThesisMethodologyRejectionEmail(
          student_details.email,
          student_details.first_name,
          req.user_data.email,
          `${req.user_data.first_name} ${req.user_data.last_name}`,
          body?.comment,
          thesisDetails.file_url
        );
      } catch (err) {
        logger.error(err, 'error sending email');
      }

      this.handleSuccess(req, res, thesisDetails);
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/download/:thesis_id')
  async downloadThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('thesis_id') thesis_id: string
  ) {
    try {
      if (
        req.user_data.type !== 'lecturer' &&
        req.user_data.type !== 'methodology'
      ) {
        throw new ActionNotAllowedError(
          'Sorry!, You cannot perform this operation'
        );
      }

      const viewThesis = await thesisRepo.byID(thesis_id);

      const awsFileDownload = await s3Service.getDownloadSignedUrl(
        env.thesis_bucket,
        viewThesis.file_url
      );

      this.handleSuccess(req, res, awsFileDownload);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/csv-export')
  async exportCsvDocs(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    let {
      tracking_id,
      start_date,
      end_date,
      student,
      lecturer,
      methodology,
      search
    } = query;

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

    if (req.user_data.type !== 'admin') {
      throw new ActionNotAllowedError(
        'Only an Admin can perform this operation'
      );
    }
    let thesisList: any;
    // async handler so errors are caught
    await this.handleFileResponse(req, res, async (res) => {
      if (search) {
        thesisList = await thesisRepo.searchList({
          conditions,
          search,
          sort: { created_at: -1 },
          populate: ['student', 'lecturer', 'methodology']
        });
      } else {
        thesisList = await thesisRepo.all({
          conditions,
          sort: { created_at: -1 },
          populate: ['student', 'lecturer', 'methodology']
        });
      }
      await generateCsvStream(res, thesisList);
    });
  }
  // async exportCsvDocs(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @queryParam() query: PaginationQueryDTO
  // ) {
  //   if (req.user_data.type !== 'admin') {
  //     throw new ActionNotAllowedError(
  //       'Only an Admin can perform this operation'
  //     );
  //   }
  //   this.handleFileResponse(req, res, async (res) => {
  //     const viewThesis = await thesisRepo.all({
  //       conditions: {},
  //       sort: { created_at: -1 }
  //       populate: ['student', 'lecturer', 'methodology']
  //     });
  //     // console.log('>>>>>>>>>> viewThesis', viewThesis);

  //     // const csvFile =
  //     await generateCsvFile(res, viewThesis);

  //     // console.log('>>>>>>>>>> csvFile', csvFile);
  //   });
  // }
}

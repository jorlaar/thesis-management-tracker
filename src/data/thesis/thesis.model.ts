import { Model } from '../base';
import { ILecturerModel } from '../lecturer';
import { IMethodology } from '../methodology';
import { IStudentModel } from '../student';
// import ThesisSchema from './thesis.Schema';
// import s3 from '@app/server/services/s3/s3.service';
// import env from '@app/common/config/env';

export interface IThesis extends Model {
  comment?: string;
  lecturer?: string | ILecturerModel;
  methodology?: string | IMethodology;
  file_url?: string;
  student: string | IStudentModel;
  thesis_title: string;
  id?: string;
  thesis_tracking_id: string;
  student_upload_time_stamp?: Date;
  lecturer_review_time_stamp?: Date;
  methodology_review_time_stamp?: Date;
  thesis_status: THESIS_STATUS;
  thesis_level?: THESIS_LEVEL;
  thesis_chapter?: THESIS_CHAPTER[];
  download_url?: string;
  //  disabled alongside the getSignedDownloadUrl method in thesis.Schema.ts
  // getSignedDownloadUrl: () => Promise<string | null>;
}

export type THESIS_LEVEL =
  | 'pre_field'
  | 'post_field'
  | 'full_thesis'
  | 'partial_thesis';

export enum THESIS_STATUS {
  approved_by_supervisor = 'approved_by_supervisor',
  rejected_by_supervisor = 'rejected_by_supervisor',
  approved_by_methodology = 'approved_by_methodology',
  rejected_by_methodology = 'rejected_by_methodology',
  awaiting_supervisor_review = 'awaiting_supervisor_review',
  awaiting_methodology_review = 'awaiting_methodology_review',
  // under_supervisor_review = 'under_supervisor_review',
  // under_methodology_review = 'under_methodology_review',
  revision_requested_by_supervisor = 'revision_requested_by_supervisor',
  revision_requested_by_methodology = 'revision_requested_by_methodology'
}

export enum THESIS_CHAPTER {
  ONE = 'one',
  TWO = 'two',
  THREE = 'three',
  FOUR = 'four',
  FIVE = 'five'
}

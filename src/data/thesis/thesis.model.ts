import { Model } from '../base';

export interface IThesis extends Model {
  comment_id?: string;
  lecturer_id?: string;
  methodology_id?: string;
  file_url?: string;
  student_id: string;
  thesis_tracking_id: string;
  student_upload_time_stamp?: Date;
  lecturer_review_time_stamp?: Date;
  methodology_review_time_stamp?: Date;
  thesis_status: THESIS_STATUS;
  thesis_level: THESIS_LEVEL;
  thesis_chapter: THESIS_CHAPTER[];
}

export type THESIS_LEVEL = 'pre_field' | 'post_field';

export enum THESIS_STATUS {
  approved_by_supervisor = 'approved_by_supervisor',
  rejected_by_supervisor = 'rejected_by_supervisor',
  approved_by_methodology = 'approved_by_methodology',
  rejected_by_methodology = 'rejected_by_methodology',
  awaiting_supervisor_review = 'awaiting_supervisor_review',
  awaiting_methodology_review = 'awaiting_methodology_review',
  under_supervisor_review = 'under_supervisor_review',
  under_methodology_review = 'under_methodology_review',
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

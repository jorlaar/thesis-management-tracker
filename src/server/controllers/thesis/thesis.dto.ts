export interface ThesisDTO {
  lecturer: string;
  file: string;
  thesis_chapter?: string | string[];
  comment?: string;
  thesis_title: string;
  thesis_level?: string;
}

export interface lecturerCommentUpload {
  // file?: string;
  comment?: string;
  // student?: string;
  thesis_id: string;
}

export interface lecturerReviewUpload {
  file: string;
  comment?: string;
  student: string;
  thesis_id: string;
}

export interface methodologyCommentUpload {
  // file?: string;
  comment?: string;
  // student?: string;
  thesis_id: string;
}

export interface methodologyReviewUpload {
  file: string;
  comment?: string;
  student: string;
  thesis_id: string;
}

export type ThesisQuery = {
  student: string;
  lecturer?: string;
  methodology?: string;
  [key: string]: any; // For other dynamic properties
};

export interface PaginationQueryDTO {
  page: number;
  per_page: number;
  tracking_id?: string;
  student?: string;
  lecturer?: string;
  methodology?: string;
  start_date?: Date;
  end_date?: Date;
  archived?: boolean;
  status?: string;
  search?: string;
}

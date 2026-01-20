export interface ThesisDTO {
  lecturer_email: string;
  file_url: string;
  thesis_chapter?: string | string[];
  comment?: string;
  thesis_level: string;
}

export interface lecturerCommentUpload {
  file_url?: string;
  comment: string;
  student_email: string;
}

export interface methodologyCommentUpload {
  file_url?: string;
  comment: string;
  student_email: string;
}

export type ThesisQuery = {
  student_id: string;
  lecturer_id?: string;
  methodology_id?: string;
  [key: string]: any; // For other dynamic properties
};

export interface PaginationQueryDTO {
  page: number;
  per_page: number;
  archived?: boolean;
  status?: string;
}

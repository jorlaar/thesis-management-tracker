export interface ThesisDTO {
  lecturer: string;
  file: string;
  thesis_chapter?: string | string[];
  comment?: string;
  thesis_title: string;
  thesis_level?: string;
}

export interface lecturerCommentUpload {
  // file_url?: string;
  file?: string;
  comment: string;
  student: string;
}

export interface methodologyCommentUpload {
  // file_url?: string;
  file?: string;
  comment: string;
  student: string;
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
  archived?: boolean;
  status?: string;
}

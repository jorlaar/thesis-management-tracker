export interface ThesisDTO {
  lecturer_email: string;
  file_url: string;
  thesis_chapter?: string | string[];
  comment?: string;
  thesis_level: string;
}

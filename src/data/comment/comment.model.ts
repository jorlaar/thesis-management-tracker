import { Model } from '../base';

export interface IComment extends Model {
  id: string;
  comment: string;
  thesis_id: string;
  lecturer_id?: string;
  methodology_id?: string;
  student_id?: string;
}

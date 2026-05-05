import { Model } from '../base';

export interface IComment extends Model {
  id: string;
  comment: string;
  thesis: string;
  lecturer?: string;
  methodology?: string;
  student?: string;
}

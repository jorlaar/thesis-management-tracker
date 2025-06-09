import { BaseRepository } from '../base';
import { IComment } from './comment.model';
import CommentSchema from './comment.schema';

export class CommentRepository extends BaseRepository<IComment> {
  constructor() {
    super('Comment', CommentSchema);
  }
}

export default new CommentRepository();

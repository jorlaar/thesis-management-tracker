import { BaseRepository } from '../base';
import { ILecturerModel } from './lecturer.model';
import { LecturerSchema } from './lecturer.schema';
import { Model } from '../base';

export interface LecturerSchema extends Model {
  phone_number: string;
}

class LecturerRepository extends BaseRepository<ILecturerModel> {
  constructor() {
    super('lecturer', LecturerSchema);
  }

  async getAllLecturer(): Promise<ILecturerModel[]> {
    return await this.model.find({});
  }
}

export default new LecturerRepository();

import { BaseRepository } from '../base';
import { IMethodology } from './methodology.model';
import MethodologySchema from './methodology.schema';

export class Methodologyrepository extends BaseRepository<IMethodology> {
  constructor() {
    super('methodology', MethodologySchema);
  }
}

export default new Methodologyrepository();

import studentRepo from '@app/data/student/student.repo';

import { adminFilters } from '../base/utils';
import { SortOrder } from 'mongoose';
// import { randomDigits } from '@app/server/utils/miscellaneous';
import _ from 'lodash';
import { BaseRepository } from '../base';
import ThesisSchema, {  } from './thesis.Schema';
import { IThesis } from './thesis.model';
/**
 * Repository class for executing student operations triggered by an admin
 */
export class AdminRepository extends BaseRepository<IThesis> {
  constructor() {
    super('thesis', ThesisSchema);
  }
  /**
   * Returns an object for querying for a student's profile
   * @param queryOptions The options for the db query
   */
  studentQuery(queryOptions: any) {
    const { id, archived } = queryOptions;
    const query = adminFilters.uniqueId(id);
    const deleted_at = archived ? { $ne: undefined } : undefined;
    const baseQuery = { ...query, deleted_at };
    return { ...baseQuery };
  }

  /**
   * Gets a student on the behalf of an admin
   * @param queryOptions The DB query options
   */
  async getstudent(queryOptions: any) {
    const { id, archived } = queryOptions;
    const query = this.studentQuery({ id, archived });
    return studentRepo.byQuery(query, null, archived);
  }

  /**
   * Gets multiple students on the behalf of an admin
   * @param query Express Request query object for getting multiple students
   */
  async getMultiplestudents(query: any) {
    const conditions = query;
    const sort = { last_name: 1 as SortOrder };

    return studentRepo.list({
      conditions,
      archived: query.archived,
      page: query.page,
      per_page: query.per_page,
      return_total_pages: true,
      sort
    });
  }

  /**
   * Updates a student's profile on the behalf of an admin
   * @param body Request body sent for updating student profile
   */
  async updatestudentProfile(body: any) {
    const { student, archived = false, ...update } = body;
    const query = this.studentQuery({ id: student, archived });
    const { location, deleted_at, ...rest } = update;
    const actualUpdate = { ...rest };

    if (update.location) {
      for (const k in location) {
        actualUpdate[`location.${k}`] = location[k];
      }
    }

    return studentRepo.updateWithOperators(query, {
      $set: actualUpdate,
      ...(deleted_at && { $unset: { deleted_at: 1 } })
    });
  }

  async deletestudent(student: string) {
    return studentRepo.remove(adminFilters.uniqueId(student));
  }
}

export default new AdminRepository();

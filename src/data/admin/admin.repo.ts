import adminRepo from '@app/data/student/student.repo';

import { adminFilters } from '../base/utils';
import { SortOrder } from 'mongoose';
// import { randomDigits } from '@app/server/utils/miscellaneous';
import _ from 'lodash';
import { BaseRepository } from '../base';
import { AdminSchema } from './admin.Schema';
import { IAdmin } from './admin.model';
/**
 * Repository class for executing admin operations triggered by an admin
 */
export class AdminRepository extends BaseRepository<IAdmin> {
  constructor() {
    super('admin', AdminSchema);
  }
  /**
   * Returns an object for querying for a admin's profile
   * @param queryOptions The options for the db query
   */
  adminQuery(queryOptions: any) {
    const { id, archived } = queryOptions;
    const query = adminFilters.uniqueId(id);
    const deleted_at = archived ? { $ne: undefined } : undefined;
    const baseQuery = { ...query, deleted_at };
    return { ...baseQuery };
  }

  /**
   * Gets a admin on the behalf of an admin
   * @param queryOptions The DB query options
   */
  async getadmin(queryOptions: any) {
    const { id, archived } = queryOptions;
    const query = this.adminQuery({ id, archived });
    return adminRepo.byQuery(query, null, archived);
  }

  /**
   * Gets multiple admins on the behalf of an admin
   * @param query Express Request query object for getting multiple admins
   */
  async getMultipleadmins(query: any) {
    const conditions = query;
    const sort = { last_name: 1 as SortOrder };

    return adminRepo.list({
      conditions,
      archived: query.archived,
      page: query.page,
      per_page: query.per_page,
      return_total_pages: true,
      sort
    });
  }

  /**
   * Updates a admin's profile on the behalf of an admin
   * @param body Request body sent for updating admin profile
   */
  async updateadminProfile(body: any) {
    const { admin, archived = false, ...update } = body;
    const query = this.adminQuery({ id: admin, archived });
    const { location, deleted_at, ...rest } = update;
    const actualUpdate = { ...rest };

    if (update.location) {
      for (const k in location) {
        actualUpdate[`location.${k}`] = location[k];
      }
    }

    return adminRepo.updateWithOperators(query, {
      $set: actualUpdate,
      ...(deleted_at && { $unset: { deleted_at: 1 } })
    });
  }

  async deleteadmin(admin: string) {
    return adminRepo.remove(adminFilters.uniqueId(admin));
  }
}

export default new AdminRepository();

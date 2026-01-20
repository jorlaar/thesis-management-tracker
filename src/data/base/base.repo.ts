import mongoose, {
  ClientSession,
  Document,
  Model,
  QueryWithHelpers,
  Schema,
  UpdateWriteOpResult
} from 'mongoose';
import { DuplicateModelError, ModelNotFoundError } from '.';
import { Repository, Query, QueryResult, PaginationQuery } from '.';

export class BaseRepository<T extends Document> implements Repository<T> {
  model: Model<T>;
  constructor(private name: string, schema: Schema) {
    this.model = mongoose.model<T>(name, schema);
  }

  /**
   * checks if the archived argument is either undefined
   * or passed as a false string in the cause of query params, and
   * converts it to a boolean.
   * @param archived string or boolean archived option
   */
  convertArchived = (archived) =>
    archived === undefined || archived === false ? false : true;

  /**
   * Converts a passed condition argument to a query
   * @param condition string or object condition
   */
  getQuery = (condition: string | object) => {
    return typeof condition === 'string'
      ? { _id: condition }
      : { ...condition };
  };

  /**
   * Creates one or more documets.
   */
  async create(attributes: any, session: ClientSession = null): Promise<T> {
    try {
      const result = session
        ? (await this.model.create([attributes], { session }))[0]
        : await this.model.create(attributes);

      return result;
    } catch (err) {
      if (err.code === 11000)
        throw new DuplicateModelError(`${this.name} exists already`);

      throw new Error(err);
    }
  }

  /**
   * Finds a document by it's id
   * @param _id
   * @param projections
   * @param archived
   */
  async byID(_id: string, projections?: any, archived?: boolean): Promise<T> {
    archived = this.convertArchived(archived);
    const result = await this.model
      .findOne({
        _id,
        ...(archived
          ? { deleted_at: { $ne: undefined } }
          : { deleted_at: undefined })
      })
      .select(projections)
      .exec();

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);

    return result;
  }

  /**
   * Finds a document by an object query.
   * @param query the query conditions
   * @param projections database projections
   * @param archived specifies if we want to get softly deleted (archived) documents or not
   */
  async byQuery(
    query: any,
    projections?: any,
    archived?: boolean | string
  ): Promise<T> {
    archived = this.convertArchived(archived);
    const result = await this.model
      .findOne({
        ...query,
        ...(archived
          ? { deleted_at: { $ne: undefined } }
          : { deleted_at: undefined })
      })
      .select(projections)
      .exec();

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);

    return result;
  }

  /**
   * Finds all documents that match a query
   * @param query
   */
  async all(query: Query): Promise<T[]> {
    const sort = query.sort || 'created_at';
    return await this.model
      .find({
        ...query.conditions,
        deleted_at: undefined
      })
      .select(query.projections)
      .sort(sort)
      .exec();
  }

  /**
   * Same as `all()` but returns paginated results.
   * @param query Query
   */
  async list(query: PaginationQuery): Promise<QueryResult<T>> {
    const page = Number(query.page) - 1 || 0;
    const per_page = Number(query.per_page) || 20;
    const offset = page * per_page;
    const sort = query.sort || 'created_at';
    const archived = this.convertArchived(query.archived);

    const conditions = {
      ...query.conditions,
      ...(archived
        ? { deleted_at: { $ne: undefined } }
        : { deleted_at: undefined })
    };

    const data = await this.model
      .find(conditions)
      .limit(per_page)
      .select(query.projections)
      .populate(query.populate)
      .skip(offset)
      .sort(sort)
      .exec();

    const result = {
      page: page + 1,
      per_page,
      sorted_by: sort,
      result: data
    };

    if (!query.return_total_pages) return result;

    const totalDocuments = await this.model.countDocuments(conditions);
    const total_pages = Math.ceil(totalDocuments / per_page);

    return { ...result, total_pages };
  }

  /**
   * Returns list of kycs with embedded `active` student object
   * @param query Query
   */
  async kyclist(query: PaginationQuery): Promise<QueryResult<T>> {
    const page = Number(query.page) - 1 || 0;
    const per_page = Number(query.per_page) || 20;
    const offset = page * per_page;
    const sort = query.sort || 'created_at';
    const archived = this.convertArchived(query.archived);

    const conditions = {
      ...query.conditions,
      ...(archived
        ? { deleted_at: { $ne: undefined } }
        : { deleted_at: undefined })
    };

    const data = await this.model
      .find(conditions)
      .select(query.projections)
      .skip(offset)
      .limit(per_page)
      .sort(sort)
      .populate('student', {
        match: { mobile_number_closed: false }
      });

    const result = {
      page: page + 1,
      per_page,
      sorted_by: sort,
      result: data
    };

    if (!query.return_total_pages) return result;

    const totalDocuments = await this.model.countDocuments(conditions);
    const total_pages = Math.ceil(totalDocuments / per_page);

    return { ...result, total_pages };
  }

  /**
   * Updates a single document that matches a particular condition.
   * Triggers mongoose `save` hooks.
   * @param condition
   * @param update
   */
  async update(condition: string | object, update: any): Promise<T> {
    const query = this.getQuery(condition);

    const result = await this.model.findOne<T>(query);

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);

    result.set(update);

    const updatedDocument = await result.save();

    return updatedDocument;
  }

  /**
   * Allows the student of atomic operators such as $inc in updates.
   * Note: It does not trigger mongoose `save` hooks.
   * @param condition Query condition to match against documents
   * @param update The document update
   */
  async updateWithOperators(
    condition: string | object,
    update: any
  ): Promise<T> {
    const query = this.getQuery(condition);

    const result = await this.model.findOneAndUpdate(query, update, {
      new: true
    });

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);

    return result;
  }

  /**
   * Updates multiple documents that match a query
   * @param condition
   * @param update
   */
  async updateAll(
    condition: string | object,
    update: any
  ): Promise<QueryWithHelpers<UpdateWriteOpResult, T[]>> {
    const query = this.getQuery(condition);

    return await this.model.updateMany(query, update);
  }

  /**
   * Soft deletes a document by created `deleted_at` field in the document and setting it to true.
   * @param condition
   */
  async remove(condition: string | object): Promise<T> {
    const query = this.getQuery(condition);

    const result = await this.model.findOneAndUpdate(
      query,
      {
        deleted_at: new Date()
      },
      {
        new: true
      }
    );

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);
    return result;
  }

  /**
   * Permanently deletes a document by removing it from the collection(DB)
   * @param condition
   */
  async destroy(condition: string | object): Promise<T> {
    const query = this.getQuery(condition);

    const result = await this.model.findOneAndDelete(query);

    if (!result) throw new ModelNotFoundError(`${this.name} not found`);

    return result;
  }
}

import { ClientSession, QueryWithHelpers, SortOrder, UpdateWriteOpResult } from 'mongoose';

export type Sort =
  | string
  | {
      [key: string]:
        | SortOrder
        | {
            $meta: any;
          };
    }
  | [string, SortOrder][];
export interface QueryResult<T> {
  page: number;
  per_page: number;
  sorted_by: Sort;
  result: T[];
  total_pages?: number;
}

/**
 * A repository query that specifies pagination options
 */
export interface PaginationQuery {
  archived?: boolean | string;
  conditions: any;
  page?: number;
  per_page?: number;
  projections?: any;
  sort?: Sort;
  return_total_pages?: boolean;
}

/**
 * A repository query
 */
export interface Query {
  conditions: any;
  projections?: any;
  sort?: Sort;
}

export interface Repository<T> {
  create(attributes: any, session?: ClientSession): Promise<T>;
  byID(id: string, projections?: any, archived?: boolean): Promise<T>;
  byQuery(query: any, projections?: any, archived?: boolean): Promise<T>;
  list(query: PaginationQuery): Promise<QueryResult<T>>;
  all(query: Query): Promise<T[]>;
  update(condition: string | object, update: any): Promise<T>;
  updateWithOperators(condition: string | object, update: any): Promise<T>;
  updateAll(condition: string | object, update: any): Promise<QueryWithHelpers<UpdateWriteOpResult, T[]>>;
  remove(condition: string | object): Promise<T>;
  destroy(condition: string | object): Promise<T>;
}

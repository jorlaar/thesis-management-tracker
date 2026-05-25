// import { v4 as uuidV4, validate as isUUID } from 'uuid';
import { v7 as uuidV7, validate as isUUID } from 'uuid';
import joi from 'joi';
import { Schema, SchemaTypes } from 'mongoose';
import { CondPairUnary, cond } from 'lodash';

type studentQuerySelector = CondPairUnary<string, Record<string, unknown>>;

/**
 * Removes _id field in subdocuments and allows virtual fields to be returned
 */
export const readMapper = {
  toJSON: {
    virtuals: true,
    versionKey: false,
    getters: true,
    transform: (_, ret, __) => {
      const {
        password,
        identity_banking,
        oauth_providers,
        security_questions,
        ...rest
      } = ret;
      return rest;
    }
  }
};

/**
 * Defines timestamps fields in a schema
 */
export const timestamps = {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

/**
 * Replaces the default mongoose id with a uuid string
 */
export const uuid = {
  type: Schema.Types.String,
  // default: () => uuidV4()
  default: () => uuidV7()
};

/**
 * Defines a schema type with a trimmed string
 */
export const trimmedString = {
  type: SchemaTypes.String,
  trim: true
};

/**
 * Defines a schema type with a lowercased string
 */
export const lowercaseString = {
  type: SchemaTypes.String,
  lowercase: true
};

const isEmail = (value: string) =>
  joi.string().email().trim().validate(value).error == null;

const makeNameQuery = (student: string): Record<string, unknown> => {
  const regexMatch = { $regex: escapeRegex(student), $options: 'i' };
  return {
    $or: [{ first_name: regexMatch }, { last_name: regexMatch }]
  };
};

const uuidSelector: studentQuerySelector = [isUUID, (_id: string) => ({ _id })];

const emailSelector: studentQuerySelector = [isEmail, (email) => ({ email })];
const nameSelector: studentQuerySelector = [() => true, makeNameQuery];

const uniqueIdSelectors = [uuidSelector];

const nonUniqueSelectors: studentQuerySelector[] = [
  ...uniqueIdSelectors,
  emailSelector,
  nameSelector
];

/**
 * Methods for making a student mobile_number query filter based on the kind of student information provided
 */
export const adminFilters = {
  /**
   * Returns a filter that matches unique student mobile_numbers based on an ID
   * @param student the student's ID, phone number, or mobile_number number
   */
  uniqueId(student: string) {
    return cond(uniqueIdSelectors)(student);
  },

  /**
   * Returns a filter that can match [potentially] multiple student mobile_numbers.
   * @param student the student's ID, phone number, mobile_number number, first or last name, email, or BVN
   */
  nonUniqueId(student: string) {
    return cond(nonUniqueSelectors)(student);
  }
};

/**
 * escapeRegex prepends a `\` to Regexp modifiers in `str`.
 * This allows us to pass student input to a $regex query without
 * accidentally running student-specified regular expressions.
 * Without this, we would expose our services to regular expression
 * denial of service.
 *
 * @see https://github.com/component/escape-regexp/blob/master/index.js
 */
function escapeRegex(str: string): string {
  return str.replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
}

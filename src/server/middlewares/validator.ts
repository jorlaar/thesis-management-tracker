import { Request, Response, NextFunction } from 'express';
import HttpStatus from 'http-status-codes';
import joi, { ValidationError, AnySchema } from 'joi';
import logger from '@app/common/services/logger/logger';
import MetricsService from '../services/metrics/metrics.service';

export const parseError = (error: ValidationError) => {
  const parsedError = error.details.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.context.key]: curr.message
    }),
    {}
  );
  return parsedError;
};

const validate = (dataValue: any, schema: joi.AnySchema) => {
  const { error, value } = schema.validate(dataValue, {
    abortEarly: false,
    stripUnknown: true
  });
  if (!error)
    return {
      err: null,
      value: value
    };

  return {
    err: parseError(error),
    value: null
  };
};

type ValidatorContext = 'body' | 'query';

export default (schema: AnySchema, context: ValidatorContext = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { err, value } = validate(req[context], schema);
    if (!err) {
      req[context] = value;
      return next();
    }

    const errMessage =
      err[Object.keys(err)[0]] || 'One or more validation errors occurred';

    res.jSend.error(err, errMessage, HttpStatus.UNPROCESSABLE_ENTITY);

    logger.logAPIError(req, res, err);
    res.getHeader('X-Response-Time') && MetricsService.record(req, res);
  };
};

export const fileAndBodyValidator = (schema: joi.AnySchema) => {
  return (req: Request, res: Response, next: NextFunction) => {

    // console.log('>>>>>>>>', {
    //   ...req.body,
    //   file: req.file // multer adds this
    // });

    const combined = {
      ...req.body,
      file: req.file // multer adds this
    };

    const { err, value } = validate(combined, schema);

    if (!err) {
      const { file, ...bodyFields } = value;
      req.body = bodyFields;
      return next();
    }

    const errMessage =
      err[Object.keys(err)[0]] || 'One or more validation errors occurred';
    res.jSend.error(err, errMessage, HttpStatus.UNPROCESSABLE_ENTITY);
    logger.logAPIError(req, res, err);
    res.getHeader('X-Response-Time') && MetricsService.record(req, res);
  };
};

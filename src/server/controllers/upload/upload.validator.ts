import { SupportedContentTypes } from '@app/server/services/s3/s3.type';
import joi from 'joi';

export const GetUploadSignedURLRequestValidator = joi.object({
  mime_type: joi
    .string()
    .trim()
    .valid(...SupportedContentTypes)
    .required()
});
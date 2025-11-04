import { THESIS_CHAPTER } from '@app/data/thesis/thesis.model';
import joi from 'joi';

export const studentUploadThesisValidator = joi.object({
  file_url: joi.string().required().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  comment: joi.string().trim(),
  lecturer_email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@babcock\.edu\.ng$/)
    .trim()
    .required(),
  thesis_level: joi.string().valid('pre_field', 'post_field').required(),
  thesis_chapter: joi
    .alternatives()
    .try(
      joi.string().valid(...Object.values(THESIS_CHAPTER)),
      joi.array().items(joi.string().valid(...Object.values(THESIS_CHAPTER)))
    )
    .required()
});

export const lecturerUploadCommentValidator = joi.object({
  file_url: joi.string().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  comment: joi.string().trim().required(), // required drop down on the front end
  student_email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@pg\.babcock\.edu\.ng$/)
    .trim()
    .required()
});

export const methodologyUploadCommentValidator = joi.object({
  file_url: joi.string().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  comment: joi.string().trim().required(),
  student_email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@pg\.babcock\.edu\.ng$/)
    .trim()
    .required()
});

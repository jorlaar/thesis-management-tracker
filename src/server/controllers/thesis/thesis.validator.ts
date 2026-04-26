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
    // .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      // 'string.pattern.base':
      //   'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  thesis_level: joi
    .string()
    .valid('pre_field', 'post_field', 'full_thesis')
    .required(),
  // thesis_chapter: joi
  //   .alternatives()
  //   .try(
  //     joi.string().valid(...Object.values(THESIS_CHAPTER)),
  //     joi.array().items(joi.string().valid(...Object.values(THESIS_CHAPTER))),
  //     joi.string().custom((value, helpers) => {
  //       // Split comma-separated string and trim each part
  //       const items = value.split(',').map((item) => item.trim());

  //       // Validate each item
  //       for (const item of items) {
  //         if (!Object.values(THESIS_CHAPTER).includes(item)) {
  //           return helpers.error('any.invalid');
  //         }
  //       }

  //       return items; // Returns array for further validation
  //     }, 'CSV to array transformation')
  //   )
  //   .required()

  thesis_chapter: joi
    .custom((value, helpers) => {
      // Always convert to array for consistency
      let chaptersArray = [];

      if (typeof value === 'string') {
        chaptersArray = value.split(',').map((item) => item.trim());
      } else if (Array.isArray(value)) {
        chaptersArray = value;
      } else {
        return helpers.error('any.invalid');
      }
      const validValues = Object.values(THESIS_CHAPTER);
      const invalidChapters = chaptersArray.filter(
        (chap) => !validValues.includes(chap)
      );

      if (invalidChapters.length > 0) {
        return helpers.error('any.invalid', {
          message: `Invalid chapters: ${invalidChapters.join(', ')}`
        });
      }

      return chaptersArray; // Always returns array
    })
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
    // .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      // 'string.pattern.base':
      //   'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    })
});

export const methodologyUploadCommentValidator = joi.object({
  file_url: joi.string().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  comment: joi.string().trim().required(),
  student_email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    // .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      // 'string.pattern.base':
      //   'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    })
});

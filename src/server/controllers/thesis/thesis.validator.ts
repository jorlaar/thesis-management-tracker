import { THESIS_CHAPTER } from '@app/data/thesis/thesis.model';
import { ThesisSupportedContentTypes } from '@app/server/services/s3/s3.type';
import joi from 'joi';

// export const studentUploadThesisValidator = joi.object({
//   // file_url: joi.string().required().uri(), // Ensure it's a valid URL
//   // file: joi.string().required().valid('pdf', 'doc', 'docx'),
//   // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
//   // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
//   // file: joi.string().required().valid('pdf', 'doc', 'docx'),
//   // file: joi.object({
//   //   mimetype: joi.string().valid(...ThesisSupportedContentTypes)
//   // }).required(),
//   file: joi
//     .object({
//       fieldname: joi.string().required(), // e.g. "thesis"
//       mimetype: joi
//         .string()
//         .valid(...ThesisSupportedContentTypes) // your allowed MIME types the whitelist of MIME types
//         .required()
//         .messages({ 'any.only': 'Unsupported file type' })
//       // optionally validate size, originalname, etc.
//     })
//     .required()
//     .messages({ 'any.required': 'No file uploaded' }),
//   comment: joi.string().trim(),
//   thesis_title: joi.string().trim().required(),
//   lecturer_email: joi
//     .string()
//     .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
//     // .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
//     .trim()
//     .required()
//     .messages({
//       // 'string.pattern.base':
//       //   'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
//       'string.empty': 'Email is required',
//       'any.required': 'Email is required'
//     }),
//   thesis_level: joi
//     .string()
//     .valid('pre_field', 'post_field', 'full_thesis')
//     .required(),
//   // thesis_chapter: joi
//   //   .alternatives()
//   //   .try(
//   //     joi.string().valid(...Object.values(THESIS_CHAPTER)),
//   //     joi.array().items(joi.string().valid(...Object.values(THESIS_CHAPTER))),
//   //     joi.string().custom((value, helpers) => {
//   //       // Split comma-separated string and trim each part
//   //       const items = value.split(',').map((item) => item.trim());

//   //       // Validate each item
//   //       for (const item of items) {
//   //         if (!Object.values(THESIS_CHAPTER).includes(item)) {
//   //           return helpers.error('any.invalid');
//   //         }
//   //       }

//   //       return items; // Returns array for further validation
//   //     }, 'CSV to array transformation')
//   //   )
//   //   .required()

//   thesis_chapter: joi
//     .custom((value, helpers) => {
//       // Always convert to array for consistency
//       let chaptersArray = [];

//       if (typeof value === 'string') {
//         chaptersArray = value.split(',').map((item) => item.trim());
//       } else if (Array.isArray(value)) {
//         chaptersArray = value;
//       } else {
//         return helpers.error('any.invalid');
//       }
//       const validValues = Object.values(THESIS_CHAPTER);
//       const invalidChapters = chaptersArray.filter(
//         (chap) => !validValues.includes(chap)
//       );

//       if (invalidChapters.length > 0) {
//         return helpers.error('any.invalid', {
//           message: `Invalid chapters: ${invalidChapters.join(', ')}`
//         });
//       }

//       return chaptersArray; // Always returns array
//     })
//     .required()
// });

export const lecturerUploadCommentValidator = joi.object({
  //file_url: joi.string().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  file: joi.object({
    fieldname: joi.string().required(), // e.g. "thesis"
    mimetype: joi
      .string()
      .valid(...ThesisSupportedContentTypes) // your allowed MIME types the whitelist of MIME types
      .required()
      .messages({ 'any.only': 'Unsupported file type' })
  }), // it's optional for lecturer and methodology,
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
  // file_url: joi.string().uri(), // Ensure it's a valid URL
  // .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
  // .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
  file: joi.object({
    fieldname: joi.string().required(), // e.g. "thesis"
    mimetype: joi
      .string()
      .valid(...ThesisSupportedContentTypes) // your allowed MIME types the whitelist of MIME types
      .required()
      .messages({ 'any.only': 'Unsupported file type' })
  }), // it's optional for methodology and lecturer
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

export const studentUploadThesisValidator = joi.object({
  file: joi
    .object({
      fieldname: joi.string().required(), // e.g. "thesis"
      mimetype: joi
        .string()
        .valid(...ThesisSupportedContentTypes) // your allowed MIME types the whitelist of MIME types
        .required()
        .messages({ 'any.only': 'Unsupported file type' })
    })
    .required()
    .messages({ 'any.required': 'No file uploaded' }),
  comment: joi.string().trim(),
  thesis_title: joi.string().trim().required(),
  lecturer: joi.string().trim().required().messages({
    'string.empty': 'lecturer details is required',
    'any.required': 'lecturer details is required'
  }),
  thesis_level: joi
    .string()
    .valid('pre_field', 'post_field', 'full_thesis', 'partial_thesis')
    .default('partial_thesis')
    .required(),

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
});

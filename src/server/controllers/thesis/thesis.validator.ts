// import { THESIS_CHAPTER } from '@app/data/thesis/thesis.model';
import { ThesisSupportedMimeTypes } from '@app/server/services/s3/s3.type';
import joi from 'joi';

const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;

// export const studentUploadThesisValidator = joi.object({
// file_url: joi.string().required().uri(), // Ensure it's a valid URL
// file: joi.string().required().valid('pdf', 'doc', 'docx'),
// .regex(/\.(docx?|pdf)$/i) // Match .doc, .docx, or .pdf (case-insensitive)
// .message('File must be a Word (.doc/.docx) or PDF (.pdf)'),
// file: joi.string().required().valid('pdf', 'doc', 'docx'),
// file: joi.object({
//   mimetype: joi.string().valid(...ThesisSupportedMimeTypes)
// }).required(),
//   file: joi
//     .object({
//       fieldname: joi.string().required(), // e.g. "thesis"
//       mimetype: joi
//         .string()
//         .valid(...ThesisSupportedMimeTypes) // your allowed MIME types the whitelist of MIME types
//         .required()
//         .messages({ 'any.only': 'Unsupported file type' })
// optionally validate size, originalname, etc.
//     })
//     .required()
//     .messages({ 'any.required': 'No file uploaded' }),
//   comment: joi.string().trim(),
//   thesis_title: joi.string().trim().required(),
//   lecturer_email: joi
//     .string()
//     .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
// .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
//     .trim()
//     .required()
//     .messages({
// 'string.pattern.base':
//   'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
//       'string.empty': 'Email is required',
//       'any.required': 'Email is required'
//     }),
//   thesis_level: joi
//     .string()
//     .valid('pre_field', 'post_field', 'full_thesis')
//     .required(),
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
      .valid(...ThesisSupportedMimeTypes) // your allowed MIME types the whitelist of MIME types
      .required()
      .messages({ 'any.only': 'Unsupported file type' })
  }), // it's optional for lecturer and methodology,
  comment: joi.string().trim(), // required drop down on the front end
  student: joi.string().trim(),
  thesis_id: joi
    .string()
    .trim()
    .required()
    .uuid({
      version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
    })
    .messages({
      'string.pattern': 'thesis id should be a valid uuid'
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
      .valid(...ThesisSupportedMimeTypes) // your allowed MIME types the whitelist of MIME types
      .required()
      .messages({ 'any.only': 'Unsupported file type' })
  }), // it's optional for methodology and lecturer
  comment: joi.string().trim(),
  student: joi.string().trim(),
  thesis_id: joi
    .string()
    .trim()
    .required()
    .uuid({
      version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
    })
    .messages({
      'string.pattern': 'thesis id should be a valid uuid'
    })
});

export const studentUploadThesisValidator = joi.object({
  file: joi
    .object({
      fieldname: joi.string().required(), // e.g. "thesis"
      mimetype: joi
        .string()
        .valid(...ThesisSupportedMimeTypes) // your allowed MIME types the whitelist of MIME types
        .required()
        .messages({ 'any.only': 'Unsupported file type' })
    })
    .required()
    .messages({ 'any.required': 'No file uploaded' }),
  comment: joi.string().trim(),
  thesis_title: joi.string().trim().required(),
  lecturer: joi
    .string()
    .trim()
    .required()
    .uuid({
      version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
    })
    .messages({
      // drop down of registered lecturers
      'string.empty': 'lecturer details is required',
      'any.required': 'lecturer details should be a valid uuid'
    }),
  thesis_level: joi
    .string()
    .trim()
    .empty(null) // treat null as "empty" → converts to undefined
    .empty('') // treat '' (after trim) as empty → converts to undefined
    // .default('partial_thesis') // apply default when value is undefined (including converted undefined)
    .optional()
    .valid('pre_field', 'post_field', 'full_thesis', 'partial_thesis'),

  // thesis_chapter: joi.custom((value, helpers) => {
  //   // Always convert to array for consistency
  //   let chaptersArray = [];

  //   if (typeof value === 'string') {
  //     chaptersArray = value.split(',').map((item) => item.trim());
  //   } else if (Array.isArray(value)) {
  //     chaptersArray = value;
  //   } else {
  //     return helpers.error('any.invalid');
  //   }
  // const validValues = Object.values(THESIS_CHAPTER);
  // const invalidChapters = chaptersArray.filter(
  //   (chap) => !validValues.includes(chap)
  // );

  // if (invalidChapters.length > 0) {
  //   return helpers.error('any.invalid', {
  //     message: `Invalid chapters: ${invalidChapters.join(', ')}`
  //   });
  // }

  //   return chaptersArray; // Always returns array
  // })
  thesis_chapter: joi
    .custom((value, helpers) => {
      // If the field is completely absent or explicitly null → treat as undefined (field not set)
      if (value === undefined || value === null) {
        return undefined; // .optional() will accept this
      }

      let chaptersArray = [];

      // Convert from string (comma-separated) or array
      if (typeof value === 'string') {
        chaptersArray = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean); // removes empty strings after trim
      } else if (Array.isArray(value)) {
        // Convert all entries to trimmed strings, then filter out null & empty
        chaptersArray = value
          .map((item) => (typeof item === 'string' ? item.trim() : item))
          .filter((item) => item !== null && item !== '');
      } else {
        return helpers.error('any.invalid');
      }

      // Return the cleaned array – even if it becomes empty
      return chaptersArray.length === 0 ? undefined : chaptersArray;
    })
    .optional() // allows the whole field to be undefined
});

export const PaginationValidator = joi
  .object({
    page: joi.number().integer().min(1).default(1),
    per_page: joi.number().integer().min(1).default(10),
    archived: joi.boolean().default(false),
    tracking_id: joi
      .string()
      .trim()
      .optional()
      .uppercase()
      .regex(ulidRegex)
      .messages({
        'string.pattern.base': 'tracking id should be a valid ulid'
      }),
    student: joi
      .string()
      .trim()
      .optional()
      .uuid({
        version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
      })
      .messages({
        'string.pattern.base': 'student details should be a valid uuid'
      }),
    lecturer: joi
      .string()
      .trim()
      .optional()
      .uuid({
        version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
      })
      .messages({
        'string.pattern.base': 'lecturer details should be a valid uuid'
      }),
    methodology: joi
      .string()
      .trim()
      .optional()
      .uuid({
        version: ['uuidv4', 'uuidv7'] // Accepts both uuidv4 and uuidv7 formats
      })
      .messages({
        'string.pattern.base': 'methodology details should be a valid uuid'
      }),
    start_date: joi.date().optional().less('now').messages({
      'date.base': 'Start date must be a valid date.',
      'date.less': 'Start date cannot be in the future.'
    }),
    end_date: joi
      .date()
      .optional()
      .greater(joi.ref('start_date'))
      .less('now')
      .messages({
        'date.base': 'End date must be a valid date.',
        'date.greater': 'End date must be after the start date.',
        'date.less': 'End date cannot be in the future.'
      }),
    search: joi.string().trim().optional().min(2)
  })
  .default({
    page: 1,
    per_page: 10,
    archived: false
  });

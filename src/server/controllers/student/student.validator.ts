import { StudentLevel } from '@app/data/student';
import joi from 'joi';

export const passwordSchema = joi
  .string()
  .trim()
  .min(6)
  .max(30)
  // .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .required()
  .messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 30 characters'
  });
// .messages({
//   'string.pattern.base':
//     'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
//   'string.min': 'Password must be at least 8 characters long',
//   'string.max': 'Password cannot exceed 30 characters'
// });

export const studentSignup = joi.object({
  dob: joi.date(),
  matric_no: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      'string.pattern.base':
        'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: joi
    .string()
    .trim()
    .min(6)
    .max(30)
    // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  first_name: joi.string().trim().required(),
  gender: joi.string().valid('male', 'female').trim(),
  last_name: joi.string().trim().required(),
  department: joi.string().trim().required(), // to do preload it drop down
  faculty: joi.string().trim().required(), // to do preload it drop down
  course: joi.string().trim().required(), // to do preload it as drop down
  level: joi
    .string()
    .valid(...Object.values(StudentLevel))
    .trim()
    .required()
});

export const studentLogin = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      'string.pattern.base':
        'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: joi
    .string()
    .trim()
    .min(6)
    .max(30)
    // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
});

export const changeStudentPassword = joi.object({
  old_password: joi
    .string()
    .trim()
    .min(6)
    .max(30)
    // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  new_password: joi
    .string()
    .trim()
    .min(6)
    .max(30)
    // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
});

export const forgotStudentPassword = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    // .pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z]+\.)*babcock\.edu\.ng$/)
    .trim()
    .required()
    .messages({
      'string.pattern.base':
        'Please enter a valid Babcock University email (e.g., name@pg.babcock.edu.ng or name@babcock.edu.ng)',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    })
});

export const ResetPasswordValidator = joi.object({
  email: joi.string().email().trim().lowercase().required(),
  password: passwordSchema
});

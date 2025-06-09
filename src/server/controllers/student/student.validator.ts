import { StudentLevel } from '@app/data/student';
import joi from 'joi';

export const studentSignup = joi.object({
  dob: joi.date(),
  matric_no: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } }) // disables TLD validation to allow custom domains
    .pattern(/^[a-zA-Z0-9._%+-]+@pg\.babcock\.edu\.ng$/)
    .trim()
    .required(),
  password: joi
    .string()
    .trim()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
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
    .pattern(/^[a-zA-Z0-9._%+-]+@pg\.babcock\.edu\.ng$/)
    .trim()
    .required(),
  password: joi
    .string()
    .trim()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
});

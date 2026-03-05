import joi from 'joi';

export const adminSignup = joi.object({
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
  last_name: joi.string().trim().required()
});

export const adminLogin = joi.object({
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

export const changeAdminPassword = joi.object({
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

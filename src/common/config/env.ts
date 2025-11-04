import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables required for all environments (dev, testing, staging, production)
 */
const requiredVariables = ['port', 'mongodb_url'];

/**
 * Environment variables required for both staging and production
 */
const productionAndStagingVariables = [];

/**
 * Requires MongoDB and Redis credentials in production and staging, else uses Redis and MongoDB connection string directly
 * in dev or any other environment
 */
if (['production', 'staging'].includes(process.env.NODE_ENV))
  requiredVariables.push(...productionAndStagingVariables);

const env = {
  amqp_url: process.env.AMQP_URL,
  port: Number(process.env.PORT),
  redis_url: process.env.REDIS_URL,
  jwt_secret: process.env.JWT_SECRET,
  expires_at: parseInt(process.env.EXPIRES_AT),
  jwt_key: process.env.JWT_KEY,
  jwt_issuers: process.env.JWT_ISSUERS,
  jwt_aud: process.env.JWT_AUD,
  default_otp: process.env.DEFAULT_OTP,
  mongodb_url: process.env.MONGODB_URL,
  redis_password: process.env.REDIS_PASSWORD,
  app_env: process.env.NODE_ENV || 'development',
  mongodb_name: process.env.MONGODB_NAME,
  mongodb_password: process.env.MONGODB_PASSWORD,
  api_version: process.env.API_VERSION || '/api/v1',
  salt_rounds: Number(process.env.SALT_ROUNDS) || 10,

  service_name: process.env.SERVICE_NAME || 'thesis-backend',

  doc_expiry_cloudinary: Number(process.env.DOC_EXPIRY_CLOUDINARY) || 3,
  cloudinary_name: process.env.CLOUDINARY_NAME,
  worker_port: Number(process.env.WORKER_PORT),
  cloudinary_key: process.env.CLOUDINARY_KEY,
  cloudinary_url: process.env.CLOUDINARY_URL,
  cloudinary_secret: process.env.CLOUDINARY_SECRET,
  aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
  aws_secret_key_access: process.env.AWS_SECRET_KEY_ACCESS,
  aws_region: process.env.AWS_REGION,
  aws_host_name: process.env.AWS_HOST_NAME,
  thesis_bucket: process.env.THESIS_BUCKET,
  secret_key_recaptcha: process.env.SECRET_KEY_RECAPTCHA
};

const missingVariables = requiredVariables.reduce((acc, variable) => {
  const isVariableMissing = !env[variable];
  return isVariableMissing ? acc.concat(variable.toUpperCase()) : acc;
}, []);

if (!!missingVariables.length)
  throw new Error(
    `The following required variables are missing: ${missingVariables}}`
  );

export default env;

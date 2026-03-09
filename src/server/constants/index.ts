// import env from '../../common/config/env';
import joi from 'joi';

export const TOKEN_CACHE_TTL = 300;
export const TOKEN_CACHE_VERIFICATION_TTL = 720; // 12 min
export const AUTH_OTP_VERIFICATION_TTL = 60 * 20; // 20 mins
// export const TOKEN_CACHE_NEW_LOGIN_TTL = 600; // 10 min

export const trimmedString = joi.string().trim();
export const trimmedRequiredString = trimmedString.required();
export const trimmedNullableString = trimmedString.allow('', null);
export const validDestinationCode = trimmedRequiredString.pattern(/[0-9]{6}$/);
export const validNigerianAccountNumber = trimmedRequiredString
  .pattern(/[0-9]+/)
  .max(20)
  .required();
export const validAmount = joi.number().positive().greater(0).required(); // in kobo
export const walletFieldSchema = joi
  .alternatives()
  .try(
    joi.string().trim().uuid().required(),
    joi.string().length(10).pattern(/^\d+$/).trim().required()
  )
  .required();

export const UpdateWebhookValidator = joi.object({
  webhook: trimmedRequiredString.uri({ scheme: 'https' }),
  webhook_secret: joi.string().trim().min(8).max(30).required()
});

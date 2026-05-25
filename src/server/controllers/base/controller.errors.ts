import HttpStatus from 'http-status-codes';

export class ControllerError extends Error {
  code: number;
  error_code: number;
  constructor(message: string, code?: number, error_code?: number) {
    super(message);
    this.code = code || 400;
    error_code = error_code || 0;
  }
}

export class ActionNotAllowedError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class SignupPreAuthRequired extends ControllerError {
  constructor() {
    const errorMessage =
      'Device change detected, please onboard your new device before proceeding to sign in';
    super(errorMessage);

    this.code = HttpStatus.FORBIDDEN;
    this.error_code = 331;
  }
}

export class UnauthenticatedError extends ControllerError {
  constructor() {
    const errorMessage = 'Missing or invalid authentication token';
    super(errorMessage);

    this.code = HttpStatus.UNAUTHORIZED;
  }
}

/**
 * Sets the HTTP status code to 404 `Not Found` when a queried item is not found.
 *
 */
export class NotFoundError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class BadRequestError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class FaceMatchValidationError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
    this.error_code = 1109;
  }
}

export class InternalServerError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class ConflictError extends ControllerError {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class studentNotFoundError extends ControllerError {
  constructor(message: string) {
    const errorMessage = `mobile_number: (${message}) not found`;
    super(errorMessage);

    this.code = HttpStatus.NOT_FOUND;
    this.error_code = 300;
  }
}

export class studentExistsError extends ControllerError {
  constructor() {
    const errorMessage = 'A student with matching details exists';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 301;
  }
}

// this is to handle scenarios where student attempts to sign up with email and phone number belonging to different existing students
export class ExistingEmailAndPhoneNumberMismatchError extends ControllerError {
  constructor() {
    const errorMessage =
      'This number or email is linked to an existing mobile_number. Can’t remember your details? Recover your mobile_number in 2 minutes! ';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
  }
}

export class CountryNotSupportedError extends ControllerError {
  constructor() {
    const errorMessage =
      'The country you have selected is not supported at the moment';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 399;
  }
}

export class InvalidPhoneNumberError extends ControllerError {
  constructor() {
    const errorMessage =
      'You may have entered a wrong phone number. Have a look and try again!';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 316;
  }
}

export class InvalidBVNError extends ControllerError {
  constructor() {
    const errorMessage =
      'Kindly check your details and try again or contact support for more details.';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class GovernmentIDNotFoundError extends ControllerError {
  constructor() {
    const errorMessage =
      'No record found for the provided BVN/NIN. Please verify the details and try again. If issue persists, kindly contact support via john_doesupport@john_doexyz';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class GovernmentIDNoMatchError extends ControllerError {
  constructor() {
    const errorMessage =
      'No matching record found for the details provided. Please verify and try again. If issue persists, kindly contact support via john_doesupport@john_doexyz';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class GovernmentIDTransposedMatchError extends ControllerError {
  constructor() {
    const errorMessage =
      "Name order doesn't match the arrangement on BVN/NIN. Please correct it and try again. If issue persists, kindly contact support via john_doesupport@john_doexyz";
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class GovernmentIDPartialMatchError extends ControllerError {
  constructor() {
    const errorMessage =
      'Name partially matches BVN/NIN. Please review and correct before trying again. If issue persists, kindly contact support via john_doesupport@john_doexyz';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class GovernmentIDInvalidResponseError extends ControllerError {
  constructor() {
    const errorMessage =
      "Oops! We couldn't retrieve enough information from our provider to verify your details. Please contact support at john_doesupport@john_doexyz for assistance.";
    super(errorMessage);

    this.code = HttpStatus.INTERNAL_SERVER_ERROR;
    this.error_code = 302;
  }
}

export class IDVerificationLimitError extends ControllerError {
  constructor() {
    const errorMessage = `Your failed BVN/NIN verification limit has been exceeded. Kindly contact support via john_doesupport@john_doexyz`;
    super(errorMessage);

    this.code = HttpStatus.TOO_MANY_REQUESTS;
    this.error_code = 429;
  }
}

export class InvalidNINError extends ControllerError {
  constructor() {
    const errorMessage =
      'Kindly check your details and try again or contact support';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 302;
  }
}

export class BVNNotSetError extends ControllerError {
  constructor() {
    const errorMessage = 'Your BVN is not set. Please set your BVN first';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 303;
  }
}

export class BVNExistsError extends ControllerError {
  constructor() {
    const errorMessage =
      'An mobile_number already exists with the provided BVN, don’t remember your details?\nYou can recover your mobile_number in 2 minutes!';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 304;
  }
}

export class NINExistsError extends ControllerError {
  constructor() {
    const errorMessage =
      'Oops! We are unable to verify your details at the moment, kindly contact support via john_doesupport@john_doexyz';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 304;
  }
}

export class InvalidPasswordError extends ControllerError {
  constructor(remainingTries: number, err_message?: string) {
    const errorMessage =
      err_message ||
      `You may have entered a wrong password. You can try ${remainingTries} more time${
        remainingTries > 1 ? 's' : ''
      } or reset your password.`;
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 305;
  }
}

export class LockedOutError extends ControllerError {
  constructor() {
    const errorMessage =
      'Due to multiple failed login attempts, your account has been temporarily locked for 24 hours. Please try again later or contact support if you need immediate assistance.';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 306;
  }
}

export class mobile_numberClosedError extends ControllerError {
  constructor() {
    const errorMessage =
      'Details provided is linked to a closed mobile_number. Kindly contact support to recover your mobile_number';
    super(errorMessage);

    this.code = HttpStatus.FORBIDDEN;
    this.error_code = 329;
  }
}

export class mobile_numberRedisLockedError extends ControllerError {
  constructor() {
    const errorMessage =
      'student has been unlocked by admin and should be redirected to the password recovery flow';
    super(errorMessage);

    this.code = HttpStatus.FORBIDDEN;
    this.error_code = 330;
  }
}

export class AddressNotSetError extends ControllerError {
  constructor() {
    const errorMessage =
      'Your address is not set. Please set your address first';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 307;
  }
}

export class EmailNotVerifiedError extends ControllerError {
  constructor() {
    const errorMessage =
      'Your email is not verified. Please verify your email first';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 307;
  }
}

export class TransactionPinBlockedError extends ControllerError {
  constructor() {
    const errorMessage =
      'Your transaction PIN has been blocked because you exceeded the number of allowed attempts.\nTry resetting your transaction PIN to regain access';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 308;
  }
}

export class InvalidPinError extends ControllerError {
  constructor(remainingTries: number) {
    const errorMessage = `You may have entered a wrong password. You can try ${remainingTries} more time ${
      remainingTries > 1 ? 's' : ''
    } or reset your password.`;
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 309;
  }
}

export class PinNotSetError extends ControllerError {
  constructor() {
    const errorMessage =
      'Your transaction PIN has not been set, please set it first';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 310;
  }
}

export class PinHasBeenSetError extends ControllerError {
  constructor() {
    const errorMessage = `Your transaction Pin has been set, if you want to change it please do a reset`;
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 310;
  }
}

export class samePinError extends ControllerError {
  constructor(message: string) {
    super(message);
    this.code = HttpStatus.BAD_REQUEST;
  }
}

export class DOBNotSetError extends ControllerError {
  constructor() {
    const errorMessage = 'Please set your "Date of Birth" first';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 311;
  }
}

export class InvalidTokenError extends ControllerError {
  constructor() {
    const errorMessage =
      '😕 The OTP you entered is incorrect. Please try again';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 312;
  }
}

export class ExpiredOtpError extends ControllerError {
  constructor() {
    const errorMessage = 'Your otp has expired';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 312;
  }
}

export class SameNumberError extends ControllerError {
  constructor() {
    const errorMessage = 'The phone numbers should not be the same';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 313;
  }
}

export class ChangeAnotherstudentNumberError extends ControllerError {
  constructor() {
    const errorMessage = 'You cannot change the number of another student';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 314;
  }
}

export class KycNotSetError extends ControllerError {
  constructor() {
    const errorMessage = 'Please set your KYC to upgrade to Tier 3';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 315;
  }
}

export class mobile_numberBlockRangeInvalidError extends ControllerError {
  constructor(min: number, max: number) {
    const errorMessage = `invalid mobile_number block range (min: ${min}, max: ${max})`;
    super(errorMessage);

    this.code = HttpStatus.EXPECTATION_FAILED;
    this.error_code = 316;
  }
}

export class mobile_numberBlockRangeOverlapError extends ControllerError {
  constructor(min: number, max: number, _min: number, _max: number) {
    const errorMessage = `mobile_number block range (min: ${min}, max: ${max}) overlaps with existing range (min: ${_min}, max: ${_max})`;
    super(errorMessage);

    this.code = HttpStatus.EXPECTATION_FAILED;
    this.error_code = 317;
  }
}

export class mobile_numberBlockCodeUsedError extends ControllerError {
  constructor() {
    const errorMessage = `this channel is in use`;
    super(errorMessage);

    this.code = HttpStatus.EXPECTATION_FAILED;
    this.error_code = 318;
  }
}

export class DocumentDateNotSetError extends ControllerError {
  constructor() {
    const errorMessage = "Your document's issue date or expiry date is not set";
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 319;
  }
}

export class ExpiredDocError extends ControllerError {
  constructor() {
    const errorMessage = 'your document is expired';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 320;
  }
}

export class AlmostExpiredDocError extends ControllerError {
  constructor(minimum_months: number) {
    const errorMessage = `The ID you provided does not meet our ${minimum_months} month validity rule. Please upload an ID that is valid for at least the next ${minimum_months} months`;
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 321;
  }
}

export class KycNotCompleteError extends ControllerError {
  constructor() {
    const errorMessage = 'KYC setup not complete';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 322;
  }
}

export class UnverifiableDocError extends ControllerError {
  constructor() {
    const errorMessage =
      'Unable to verify document. Kindly try an alternative valid document';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 323;
  }
}

export class DocumentNotValidError extends ControllerError {
  constructor() {
    const errorMessage = 'Your details do not match with the supplied document';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 324;
  }
}

export class QoreIdAxiosError extends ControllerError {
  constructor(options) {
    const { status, message, statusCode } = options;
    const errorMessage = message;

    super(errorMessage);
    this.code = status;
    this.error_code = statusCode;
  }
}

export class SelfieNotMatchError extends ControllerError {
  constructor() {
    const errorMessage =
      "We're having issues with your photo. Please see the instructions and try again.";
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 325;
  }
}

export class InvalidstudentAgentError extends ControllerError {
  constructor() {
    const errorMessage = 'invalid agent';
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 327;
  }
}

export class AccountBalanceBlockError extends ControllerError {
  constructor(tier: number, next_tier: number) {
    const errorMessage = `You have exceeded the limit for tier ${tier}. You need to upgrade your account to tier ${next_tier} to continue transacting.`;
    super(errorMessage);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 328;
  }
}

export class FrozenAccountError extends ControllerError {
  constructor() {
    super('Your account has been frozen. Kindly contact support.');

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 102;
  }
}

export class Minimummobile_numberBalanceError extends ControllerError {
  constructor() {
    super(`Please empty out your mobile_number before proceeding`);

    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 118;
  }
}

export interface studentNotFoundErrorInterface extends Error {
  code: number;
  error_code: number;
  message: string;
  name: string;
  stack: string;
}

export class TooManyRequestError extends ControllerError {
  constructor() {
    super(`You have exceeded the number requests allowed in window limit`);
    this.code = HttpStatus.TOO_MANY_REQUESTS;
  }
}

export class OauthConflictError extends ControllerError {
  constructor(message: string) {
    super(message);
    this.code = HttpStatus.FORBIDDEN;
  }
}

export class IdentityBankingAuthConflictError extends ControllerError {
  constructor(message: string) {
    super(message);
    this.code = HttpStatus.CONFLICT;
  }
}

export class GoogleOAuthError extends Error {
  code: number;
  data: any;
  error_code: number;

  constructor(message: string, data: any, code: number, error_code: number) {
    super(message);
    this.data = data;
    this.code = code;
    this.error_code = error_code;
  }
}

export class MaliciousOAuthError extends Error {
  code: number;
  data: any;
  error_code: number;

  constructor(data: any) {
    super('Invalid OAuth token used');
    this.data = data;
    this.code = HttpStatus.BAD_REQUEST;
    this.error_code = 400;
  }
}

// import { Request } from 'express';
import { PhoneNumberUtil } from 'google-libphonenumber';
// import logger, { reqSerializer } from '@app/common/services/logger';
import { BaseRepository } from '../base';
import { IStudentModel } from './student.model';
import StudentSchema from './student.schema';
// import { publisher } from '@random-guys/eventbus';
// import {
//   auth_passwordateLimiterService,
//   ReferralCodeService
// } from '@app/server/services';
// import {
//   CLOSE_mobile_number_MINIMUM_BALANCE,
//   getCurrentAndNextTier,
//   sanitiseGmailAddress
// } from '@app/server/utils';

export class StudentRepository extends BaseRepository<IStudentModel> {
  constructor() {
    super('student', StudentSchema);
  }
  private phoneUtil = PhoneNumberUtil.getInstance();

  /**
   * Validates a phone number with the googlelibphonenumber library.
   * We return the iso_code because it could change from US to CA if the number
   * is Canadian.
   * @param phone_number
   * @param iso_code
   */
  validatePhoneNumber(phone_number: string, iso_code: string) {
    let isValid = this.phoneUtil.isValidNumberForRegion(
      this.phoneUtil.parse(`+${phone_number}`, iso_code),
      iso_code
    );

    /**
     * The US and Canada use the same country code, so there is no specific way to differentiate
     * their numbers at the moment. So we validate against the Canadian region if the US region fails
     */
    if (!isValid && iso_code === 'US') {
      iso_code = 'CA';
      isValid = this.phoneUtil.isValidNumberForRegion(
        this.phoneUtil.parse(`+${phone_number}`, 'CA'),
        'CA'
      );
    }

    return { isValid, isoCode: iso_code };
  }

  /**
   * Returns a boolean indicating whether a student exists
   * @param conditions Conditions for validating the existence of the student.
   */
  async exists(conditions: object): Promise<boolean> {
    const student = await this.model.findOne(conditions);
    return !!student;
  }

  /**
   * Takes in an array of phone numbers and returns the subset of students that exist on the platform
   * makes sure to filter out the students own profile, in case they've saved their own phone number
   * @param data String array of phone numbers to check if they exist on
   */
  async getstudentsFromPhonebook(
    data: Array<string>,
    student: string
  ): Promise<Array<object>> {
    const result = await this.model
      .aggregate()
      .match({
        $and: [{ phone_number: { $in: data } }, { _id: { $ne: student } }]
      })
      .project({
        _id: 1,
        first_name: 1,
        last_name: 1,
        email: 1,
        department: 1,
        faculty: 1
      })
      .sort({ first_name: 1 })
      .exec();

    return result;
  }

  /**
   * Coverts a local Nigerian number to the International format.
   * Returns the original parameter if it is not a Nigerian phone number
   * @param phone_number
   */
  convertLocaltoInternational(phone_number: string): string {
    if (/0[7-9][0-1][0-9]{8}/i.test(phone_number))
      return phone_number.replace('0', '234');
    return phone_number;
  }

  /**
   * Fetch students in batches using pagination.
   */
  async findByBatch(limit: number, offset: number): Promise<IStudentModel[]> {
    return await this.model.find().limit(limit).skip(offset);
  }
}

/**
 * student Repository class instance shared across the app.
 */
export default new StudentRepository();

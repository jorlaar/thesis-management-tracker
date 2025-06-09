import { faker } from '@faker-js/faker';
import nock from 'nock';
import { v4 as uuidV4 } from 'uuid';
import crypto from 'crypto';
import { Gateman } from '@random-guys/gateman';
import redis from '../../src/common/services/redis';
import { SignupDTO } from '../../src/server/controllersagentagent.dto';
import { student } from '../../src/dataagent';
import env from '../../src/common/config/env';
import axios from 'axios';
import { addMinutes } from 'date-fns';
import timekeeper from 'timekeeper';
import { sanitiseGmailAddress } from '../../src/server/utils';

/**
 * Picks a random item from an array
 * @param items Array to pick the items from
 */
export function getRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Generates random digits of a specified length
 * @param length Length of the random digits
 */
export function randomDigits(length: number) {
  const digits = Array.from({ length }).reduce((prev) => {
    const randomDigit = Math.floor(Math.random() * 9);
    return prev + String(randomDigit);
  }, '');

  return digits as string;
}

/**
 * Generates a fake Nigerian phone number.
 * 2 & 7 are excluded from 0702 because the generated number acts funny at times
 */
export function generatePhoneNumber() {
  return faker.phone.phoneNumber(
    faker.random.arrayElement([
      `23470${faker.random.arrayElement([0, 1, 3, 4, 5, 6, 8, 9])}#######`,
      `2348${faker.random.number(1)}${faker.random.number({
        min: 2,
        max: 8
      })}#######`,
      `23490${faker.random.number({ min: 1, max: 9 })}#######`
    ])
  );
}

export function mockstudentRequest(): SignupDTO {
  let email = faker.internet.email();
  if (email.endsWith('gmail.com')) email = sanitiseGmailAddress(email);

  return {
    dob: faker.date.past(1993),
    gender: getRandom(['female', 'male']),
    email,
    last_name: faker.name.lastName(),
    first_name: faker.name.firstName(),
    password: randomDigits(4),
    location: {
      latitude: faker.address.latitude(),
      longitude: faker.address.longitude()
    },
    phone_number: generatePhoneNumber(),
    address_two: faker.address.secondaryAddress(),
    city: faker.address.city(),
    house_number: faker.address.streetAddress(),
    postal_code: faker.address.zipCode(),
    state: faker.address.state(),
    profile_picture: faker.image.avatar(),
    otp: randomDigits(6)
  };
}

/**
 * Unwraps a JSend API response and returns the actual data
 * @param promise The request promise
 */
export async function getResponseData<T = any>(promise: Promise<any>) {
  const res = await promise;
  return res.body.data as T;
}

/**
 * Creates a mock headless token from a partcular `service`
 * @param service The name of the service
 */
export const mockHeadlessToken = async (
  service: string,
  _uuid: string = uuidV4()
) => {
  const mockGateman = new Gateman({
    service,
    authScheme: 'jola',
    redis,
    secret: env.gateman_key
  });
  return `jola ${await mockGateman.createHeadlessToken(_uuid)}`;
};

/**
 * Mocks call to the BVN endpoint
 * @param bvn BVN string
 * @param student student data
 */
export function BVNNock(bvn: string, student: student) {
  const response = {
    status: 'success',
    data: {
      Bvn: bvn,
      DateOfBirth: student.dob,
      LastName: student.last_name,
      FirstName: student.first_name,
      PhoneNumber: student.phone_number,
      EnrollmentBankCode: randomDigits(3),
      RegistrationDate: faker.date.past(2019),
      MiddleName: faker.name.firstName().toUpperCase(),
      EnrollmentBranch: faker.address.city().toUpperCase(),
      EnrollmentBankName: faker.company.companyName().toUpperCase()
    }
  };

  nock(env.bvn_validation_endpoint).get(`?bvn=${bvn}`).reply(200, response);
}

/**
 * Mocks call to the BVN endpoint where the details are different from the requesting student
 * @param bvn BVN string
 * @param student student data
 */
export function BVNFailNock(bvn: string) {
  const response = {
    status: 'success',
    data: {
      Bvn: bvn,
      DateOfBirth: new Date(),
      LastName: faker.name.lastName(),
      FirstName: faker.name.firstName(),
      PhoneNumber: generatePhoneNumber(),
      EnrollmentBankCode: randomDigits(3),
      RegistrationDate: faker.date.past(2019),
      MiddleName: faker.name.firstName().toUpperCase(),
      EnrollmentBranch: faker.address.city().toUpperCase(),
      EnrollmentBankName: faker.company.companyName().toUpperCase()
    }
  };

  nock(env.bvn_validation_endpoint).get(`?bvn=${bvn}`).reply(200, response);
}

/**
 * Mocks calls to the watchlist endpoint
 * @param IsOnWatchList whether the mock response should return a boolean indicating that the student is on the watchlist
 * @param IsPEP whether the mock response should return a boolean indicating that the student is a PEP
 */
export function watchlistNock(IsOnWatchList: boolean, IsPEP: boolean) {
  const response = {
    message: "student's details verified",
    response: '00',
    responsedata: null,
    data: {
      IsOnWatchList,
      IsPEP
    }
  };

  nock(env.watchlist_endpoint).get('').query(true).reply(200, response);
}

/**
 * Funds a mock wallet
 * @param student student id
 * @param amount Amount to be funded in wallet
 */
export async function fundMockWallet(student: string, amount: number) {
  const body = {
    reference: uuidV4(),
    adapter: 'paystack',
    source: 'card',
    amount,
    student
  };

  const hash = crypto
    .createHmac('sha512', env.wallet_fund_key)
    .update(JSON.stringify(body))
    .digest('hex');

  const { data } = await axios.post(
    `${env.wallet_service_url}/api/v1/wallet/fund`,
    body,
    {
      headers: {
        'x-jola-signature': hash
      }
    }
  );

  return data.data;
}

export const mockCreatePaymentLink = async (amount: number, token: string) => {
  const body = {
    amount,
    passcode: '000000',
    message: 'gimme money'
  };
  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const URL = `${env.wallet_service_url}/api/v1/link`;
  const { data } = await axios.post(URL, body, options);
  return data.data;
};

export const mockClaimPaymentLink = async (link: string, passcode: string) => {
  const body = { link, passcode };
  const URL = `${env.wallet_service_url}/api/v1/link/claim`;
  const { data } = await axios.post(URL, body);
  return data.data;
};

/**
 * Time travels to a particular date
 * @param date The date to travel to
 * @param offset Additional minutes to add to the time travel date
 */
export const timeTravel = (_date: Date | string, offset?: number) => {
  const date = offset ? addMinutes(_date, offset) : _date;
  timekeeper.travel(date);
};

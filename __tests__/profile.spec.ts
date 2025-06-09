import 'reflect-metadata';
import { publisher } from '@random-guys/eventbus';
import { StatusCodes } from 'http-status-codes';
import supertest from 'supertest';
import { faker } from '@faker-js/faker';
import { redis } from '../src/common/services/redis';
import App from '../src/server/app';
import DB from '../src/server/db';
import { FlaggedWordsForNames, randomDigits } from '../src/server/utils';
import { generatePhoneNumber, BVNNock, BVNFailNock, getRandom } from './mocks';
import { getResponseData } from './mocks';
import env from '../src/common/config/env';

const BASE_URL = '/api/v1agent';

let app: App;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  env.app_env = 'test';
  await publisher.init(process.env.AMQP_URL!);

  await redis.flushAll();

  await DB.connect();
  await DB.connection.dropDatabase();

  app = new App();
  request = supertest(app.build());
  app.faculty();
});

beforeEach(async () => {
  await DB.connection.dropDatabase();
});

afterAll(async () => {
  await publisher.close();

  await DB.connection.dropDatabase();
  await DB.disconnect();
});

function signupPayload() {
  return {
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    password: randomDigits(4),
    phone_number: generatePhoneNumber()
  };
}

it.skip("gets a student's profile", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));

  const { body } = await request
    .get(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .expect(StatusCodes.OK);

  expect(body.status).toBe('success');
  expect(body.data.phone_number).toBe(payload.phone_number);
  expect(body.data.first_name).toBe(payload.first_name);
  expect(body.data.last_name).toBe(payload.last_name);
  expect(body.data.password).toBeUndefined();
});

it.skip("fails to get a student's profile if the authorization header is missing", async () => {
  const { body } = await request.get(BASE_URL).expect(StatusCodes.UNAUTHORIZED);

  expect(body.status).toBe('error');
  expect(body.message).toBe('Required Authorization header not found');
});

it.skip("updates a student's profile", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));

  const updatePayload = {
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    profile_picture: faker.image.avatar()
  };

  const { body } = await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.OK);

  const { status, data } = body;

  expect(status).toBe('success');
  expect(data.first_name).toBe(updatePayload.first_name);
  expect(data.last_name).toBe(updatePayload.last_name);
  expect(data.profile_picture).toBe(updatePayload.profile_picture);
});

it.skip("fails to update a student's profile if the authorization header is missing", async () => {
  const updatePayload = {
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    profile_picture: faker.image.avatar()
  };

  const { body } = await request
    .put(BASE_URL)
    .send(updatePayload)
    .expect(StatusCodes.UNAUTHORIZED);

  expect(body.status).toBe('error');
  expect(body.message).toBe('Required Authorization header not found');
});

it.skip("should verify a student's BVN", async () => {
  const payload = signupPayload();
  const student = await getResponseData(
    request
      .post(BASE_URL)
      .send({ ...payload, dob: new Date() })
      .expect(StatusCodes.OK)
  );

  const bvn = randomDigits(11);

  BVNNock(bvn, student.student);

  const { body } = await request
    .post(`${BASE_URL}/verify/bvn`)
    .set('Authorization', `Bearer ${student.token}`)
    .send({ bvn })
    .expect(StatusCodes.OK);

  expect(body.data.bvn).toBe(bvn);
});

it.skip("fails verify a student's BVN if the authorization header is missing", async () => {
  const { body } = await request
    .post(`${BASE_URL}/verify/bvn`)
    .send({ bvn: 12345678901 })
    .expect(StatusCodes.UNAUTHORIZED);

  expect(body.status).toBe('error');
  expect(body.message).toBe('Required Authorization header not found');
});

it.skip("fails to verify a student's BVN if there is a mismatch in the BVN details", async () => {
  const payload = signupPayload();
  const { token } = await getResponseData(
    request
      .post(BASE_URL)
      .send({ ...payload, dob: new Date() })
      .expect(StatusCodes.OK)
  );

  const bvn = randomDigits(11);

  BVNFailNock(bvn);

  const { body } = await request
    .post(`${BASE_URL}/verify/bvn`)
    .set('Authorization', `Bearer ${token}`)
    .send({ bvn })
    .expect(StatusCodes.BAD_REQUEST);

  expect(body.status).toBe('error');
  expect(body.message).toBe(
    'We were not able to verify the BVN details with your profile, please contact support'
  );
});

it.skip("fails to verify a student's BVN if their DOB is not set", async () => {
  const payload = signupPayload();
  const student = await getResponseData(
    request.post(BASE_URL).send(payload).expect(StatusCodes.OK)
  );

  const bvn = randomDigits(11);

  BVNNock(bvn, student.student);

  const { body } = await request
    .post(`${BASE_URL}/verify/bvn`)
    .set('Authorization', `Bearer ${student.token}`)
    .send({ bvn })
    .expect(StatusCodes.BAD_REQUEST);

  expect(body.status).toBe('error');
  expect(body.message).toMatch(/Date of Birth/);
});

it.skip("updates a student's profile from an android device", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));
  const mockstudentAgent =
    'jola/0.9.3 Dalvik/2.1.0 (Linux; U; Android 7.1.1; 5ecce7e8-55b8-405b-a541-4f22578fd6a0 Build/9003)';

  const updatePayload = {
    device_id: faker.string.uuid()
  };

  const { body } = await request
    .put(BASE_URL)
    .set('agent', mockstudentAgent)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.OK);

  const { status, data } = body;

  expect(status).toBe('success');
  expect(data.device_id).toBe(updatePayload.device_id);
  expect(data.devices.android).toBe(updatePayload.device_id);
});

it.skip("updates a student's profile from an ios device", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));
  const mockstudentAgent = 'jola/184 CFNetwork/1125.2 Darwin/19.4.01';

  const updatePayload = {
    device_id: faker.string.uuid()
  };

  const { body } = await request
    .put(BASE_URL)
    .set('agent', mockstudentAgent)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.OK);

  const { status, data } = body;

  expect(status).toBe('success');
  expect(data.device_id).toBe(updatePayload.device_id);
  expect(data.devices.ios).toBe(updatePayload.device_id);
});

it.skip("updates a student's referral code", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));

  const updatePayload = {
    referral_code: faker.random.alphaNumeric(6)
  };

  const { body } = await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.OK);

  const { status, data } = body;

  expect(status).toBe('success');
  expect(data.referral_code).toBe(updatePayload.referral_code);
});

it.skip('prevents updating student referral code to one that was previously used', async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));
  const intialReferralCode = student.student.referral_code;
  const secondReferralCode = faker.random.alphaNumeric(6);

  await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send({ referral_code: secondReferralCode })
    .expect(StatusCodes.OK);

  const response = await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send({ referral_code: intialReferralCode })
    .expect(StatusCodes.BAD_REQUEST);

  expect(response.body.status).toBe('error');
  expect(response.body.message).toBe(
    `Sorry the referral code "${intialReferralCode}" is taken.`
  );
});

it.skip('prevents a student from updating their referral code to one that belongs to another student', async () => {
  const student = await getResponseData(
    request.post(BASE_URL).send(signupPayload())
  );

  const { student: secondstudent } = await getResponseData(
    request.post(BASE_URL).send(signupPayload())
  );

  const updatePayload = {
    referral_code: secondstudent.referral_code
  };

  const { body } = await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.BAD_REQUEST);

  const { status, message } = body;

  expect(status).toBe('error');
  expect(message).toBe(
    `Sorry the referral code "${updatePayload.referral_code}" is taken.`
  );
});

it.skip('should not verify a BVN because someone has already used it for verification', async () => {
  const firststudentPayload = signupPayload();
  const secondstudentPayload = signupPayload();

  const { token: firststudentToken, student: firststudent } =
    await getResponseData(
      request
        .post(BASE_URL)
        .send({ ...firststudentPayload, dob: new Date() })
        .expect(StatusCodes.OK)
    );

  const { token: secondstudentToken } = await getResponseData(
    request
      .post(BASE_URL)
      .send({ ...secondstudentPayload, dob: new Date() })
      .expect(StatusCodes.OK)
  );

  const bvn = randomDigits(11);

  BVNNock(bvn, firststudent);

  await request
    .post(`${BASE_URL}/verify/bvn`)
    .set('Authorization', `Bearer ${firststudentToken}`)
    .send({ bvn })
    .expect(StatusCodes.OK);

  const { body } = await request
    .post(`${BASE_URL}/verify/bvn`)
    .set('Authorization', `Bearer ${secondstudentToken}`)
    .send({ bvn })
    .expect(StatusCodes.BAD_REQUEST);

  expect(body.status).toBe('error');
  expect(body.message).toBe(
    'This BVN has been used by another customer, please contact support'
  );
});

it.skip("fails to update a student's profile when flagged word is used as name", async () => {
  const payload = signupPayload();
  const student = await getResponseData(request.post(BASE_URL).send(payload));

  const updatePayload = {
    first_name: getRandom(FlaggedWordsForNames),
    last_name: faker.name.lastName(),
    profile_picture: faker.image.avatar()
  };

  const { body } = await request
    .put(BASE_URL)
    .set('Authorization', `Bearer ${student.token}`)
    .send(updatePayload)
    .expect(StatusCodes.UNPROCESSABLE_ENTITY);

  const { status } = body;

  expect(status).toBe('error');
});

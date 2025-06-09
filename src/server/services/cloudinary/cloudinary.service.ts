import { UploadApiOptions, v2 as cloudinary } from 'cloudinary';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';
import { faker } from '@faker-js/faker';

class Cloudinary {
  constructor() {
    cloudinary.config({
      cloud_name: env.cloudinary_name,
      api_key: env.cloudinary_key,
      api_secret: env.cloudinary_secret,
      secure: true
    });
  }

  /**
   *
   * @param file {string} path or value of the asset to be uploaded
   * @param folder {string} folder name
   * @param resource_type {string} asset type (image, video, raw etc)
   * @param value {string} value for public id could the mobile_numberno, phoneno or verification id
   * @returns {obj} upload cloudinary asset object
   */
  async uploadFile(
    file: string,
    folder: string,
    resource_type: string,
    value: string
  ) {
    try {
      if (env.app_env !== 'production')
        return {
          url: 'http://res.cloudinary.com/melas/image/upload/v1667386673/test/v0vony4bk3ytm9pumrok.pdf',
          secure_url:
            'https://res.cloudinary.com/melas/image/upload/v1667386673/test/v0vony4bk3ytm9pumrok.pdf'
        };

      return await cloudinary.uploader.upload(file, {
        phash: true,
        public_id: `${folder}/${value}`,
        resource_type: `${resource_type}`
      } as UploadApiOptions);
    } catch (error) {
      logger.error(error, {
        info: 'An error occured while uploading a file to Cloudinary',
        data: { file: file, folder: folder }
      });
      throw error;
    }
  }

  getCredentials() {
    if (env.app_env == 'test')
      return {
        name: 'melas',
        key: faker.number.int({ min: 100000000000000, max: 999999999999999 }),
        secret: faker.string.alphanumeric(15)
      };

    return {
      name: env.cloudinary_name,
      key: env.cloudinary_key,
      secret: env.cloudinary_secret
    };
  }
}

export default new Cloudinary();

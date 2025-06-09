import env from '@app/common/config/env';
import logger from '@app/common/services/logger/logger';
import S3, {
  ManagedUpload,
  HeadObjectOutput,
  HeadObjectRequest,
  DeleteObjectRequest,
  Body
} from 'aws-sdk/clients/s3';
import { faker } from '@faker-js/faker';

type SignedUrlOperation = 'putObject' | 'getObject';

export enum SupportedContentTypes {
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_JPG = 'image/jpg',
  IMAGE_PNG = 'image/png',
  VIDEO_MP4 = 'video/mp4',
  TEXT_CSV = 'text/csv'
}

interface PutObjectRequest {
  Bucket: string;
  Key: string;
  ContentType: SupportedContentTypes;
  Expires: number;
}

interface GetDownloadSignedURLRequest {
  Bucket: string;
  Key: string;
  Expires: number;
}

export default class S3Storage {
  private s3: S3;
  private isMockEnabled: boolean;

  constructor() {
    this.s3 = new S3({
      endpoint: `s3.${env.aws_region}.${env.aws_host_name}`,
      region: env.aws_region,
      credentials: {
        accessKeyId: env.aws_access_key_id,
        secretAccessKey: env.aws_secret_key_access
      },
      signatureVersion: 'v4'
    });

    this.isMockEnabled = ['test', 'development', 'staging'].includes(
      env.app_env
    );
  }

  async uploadFile(
    bucketName: string,
    file: Body,
    filePath: string
  ): Promise<ManagedUpload.SendData> {
    try {
      if(this.isMockEnabled) return {
        Location: faker.internet.url(),
        ETag: faker.internet.mac(),
        Bucket: bucketName,
        Key: filePath
      }

      const data = await this.s3
        .upload({
          Bucket: bucketName,
          Key: filePath,
          Body: file
        })
        .promise();

      logger.message({
        info: 'file upload to s3 done!',
        data
      });

      return data;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while uploading file ${filePath} to s3`
      });
    }
  }

  async downloadFile(bucketName: string, filePath: string): Promise<string> {
    try {
      const data = await this.s3
        .getObject({
          Bucket: bucketName,
          Key: filePath
        })
        .promise();

      const base64Image = Buffer.from(data.Body as ArrayBuffer).toString(
        'base64'
      );

      return base64Image;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while downloading file ${filePath} from s3`
      });
    }
  }

  async getSignedUrl(
    operation: SignedUrlOperation,
    bucketName: string,
    filePath: string,
    contentType: SupportedContentTypes,
    expirationInSeconds: number
  ) {
    try {
      const params: PutObjectRequest = {
        Bucket: bucketName,
        Key: filePath,
        ContentType: contentType,
        Expires: expirationInSeconds
      };

      const signedUrl = await this.s3.getSignedUrlPromise(operation, params);

      return signedUrl;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while generating signed url for file ${filePath} from s3`
      });
    }
  }

  async getDownloadSignedUrl(
    bucketName: string,
    filePath: string,
    expirationInSeconds: number = 300
  ) {
    try {
      const params: GetDownloadSignedURLRequest = {
        Bucket: bucketName,
        Key: filePath,
        Expires: expirationInSeconds
      };

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', params);

      return signedUrl;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while generating signed url for file ${filePath} from s3`
      });
    }
  }

  getDownloadSignedUrlSync(
    bucketName: string,
    filePath: string,
    expirationInSeconds: number = 300
  ) {
    try {
      const params: GetDownloadSignedURLRequest = {
        Bucket: bucketName,
        Key: filePath,
        Expires: expirationInSeconds
      };

      const signedUrl = this.s3.getSignedUrl('getObject', params);

      return signedUrl;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while generating signed url for file ${filePath} from s3`
      });
    }
  }

  async getFileMetadata(
    bucketName: string,
    filePath: string
  ): Promise<HeadObjectOutput> {
    try {
      const params = {
        Bucket: bucketName,
        Key: filePath
      } as HeadObjectRequest;

      const metadata = await this.s3.headObject(params).promise();

      return metadata;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while fetching metadata for file ${filePath} from s3`
      });
    }
  }

  async deleteFile(bucketName: string, filePath: string): Promise<void> {
    try {
      const params = {
        Bucket: bucketName,
        Key: filePath
      } as DeleteObjectRequest;

      await this.s3.deleteObject(params).promise();
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while fetching metadata for file ${filePath} from s3`
      });
    }
  }
}

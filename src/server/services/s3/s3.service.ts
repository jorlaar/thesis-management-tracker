import env from '@app/common/config/env';
import logger from '@app/common/services/logger/logger';
import { InternalServerError } from '@app/server/controllers/base/controller.errors';
import S3, {
  ManagedUpload,
  HeadObjectOutput,
  HeadObjectRequest,
  DeleteObjectRequest,
  Body,
  CopyObjectOutput
} from 'aws-sdk/clients/s3';
import { faker } from '@faker-js/faker';
import {
  SignedUrlOperation,
  GetDownloadSignedURLRequest,
  SupportedContentType,
  PutObjectRequest
} from './s3.type';
// import { injectable } from 'inversify';

// @injectable()
class S3Storage {
  private s3: S3;
  private isMockEnabled: boolean;

  constructor() {
    this.s3 = new S3({
      // endpoint: env.aws_host_name,
      region: env.aws_region,
      credentials: {
        accessKeyId: env.aws_access_key_id,
        secretAccessKey: env.aws_secret_key_access
      },
      signatureVersion: 'v4'
    });

    // this.isMockEnabled = ['test', 'development', 'staging'].includes(
    //   env.app_env
    // );
  }

  async uploadFile(
    bucketName: string,
    ContentType: SupportedContentType,
    file: Body,
    filePath: string
    // ): Promise<ManagedUpload.SendData & { signedUrl: string }> {
  ): Promise<ManagedUpload.SendData> {
    try {
      if (this.isMockEnabled)
        return {
          Location: faker.internet.url(),
          ETag: faker.internet.mac(),
          Bucket: bucketName,
          Key: filePath
          // signedUrl: faker.internet.url()
        };

      const data = await this.s3
        .upload({
          // Bucket: bucketName,
          Bucket: `${bucketName}/thesis`,
          Key: filePath,
          Body: file,
          ContentType: ContentType
        })
        .promise();

      // upload and generate signed url in parallel to optiimize response time for the user
      // const signedUrl = await this.getDownloadSignedUrl(bucketName, filePath);

      logger.message({
        info: 'file upload to s3 done!',
        data
      });

      return data;
      // return { ...data, signedUrl };
    } catch (err) {
      const errorMessage = `An error occurred while uploading file ${filePath} to s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
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
      const errorMessage = `An error occurred while downloading file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
    }
  }

  async getSignedUrl(
    operation: SignedUrlOperation,
    bucketName: string, //     validator(GetUploadSignedURLRequestValidator, 'query')
    filePath: string,
    contentType: SupportedContentType,
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
      const errorMessage = `An error occurred while generating signed url for file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
    }
  }

  async getDownloadSignedUrl(
    bucketName: string,
    filePath: string,
    expirationInSeconds: number = 3600 // 1 hour
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
      const errorMessage = `An error occurred while generating signed url for file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
    }
  }

  getDownloadSignedUrlSync(
    bucketName: string,
    filePath: string,
    expirationInSeconds: number = 3600 // 1 hour
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
      const errorMessage = `An error occurred while generating signed url for file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage
      });
      throw new InternalServerError(errorMessage);
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
      const errorMessage = `An error occurred while fetching metadata for file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
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
      const errorMessage = `An error occurred while fetching metadata for file ${filePath} from s3`;
      logger.error(err, {
        info: errorMessage,
        bucketName
      });
      throw new InternalServerError(errorMessage);
    }
  }

  async getFileBytes(
    bucketName: string,
    filePath: string
  ): Promise<Uint8Array> {
    try {
      const data = await this.s3
        .getObject({
          Bucket: bucketName,
          Key: filePath
        })
        .promise();

      return data.Body as Uint8Array;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while getting file bytes for ${filePath} from s3`
      });
    }
  }

  async copyFile(
    destination: { bucket: string; path: string },
    source: { bucket: string; path: string }
  ): Promise<CopyObjectOutput> {
    try {
      if (this.isMockEnabled) {
        return {
          CopyObjectResult: {
            ETag: faker.internet.mac(),
            LastModified: new Date(),
            ChecksumCRC32: faker.string.alphanumeric(100),
            ChecksumCRC32C: faker.string.alphanumeric(100),
            ChecksumSHA1: faker.string.alphanumeric(100),
            ChecksumSHA256: faker.string.alphanumeric(100)
          }
        };
      }

      const data = await this.s3
        .copyObject({
          Bucket: destination.bucket,
          Key: destination.path,
          CopySource: `${source.bucket}/${source.path}`
        })
        .promise();

      logger.message({
        info: `file copy from ${source.bucket}/${source.path} to ${destination.bucket}/${destination.path} done!`,
        data
      });

      return data;
    } catch (err) {
      logger.error(err, {
        info: `An error occurred while copying file ${source.bucket}/${source.path} to ${destination.bucket}/${destination.path}`
      });
    }
  }
}

export default new S3Storage();

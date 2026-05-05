export type SignedUrlOperation = 'putObject' | 'getObject';

export enum SignedURLPermission {
  read = 'r',
  write = 'w'
}

export enum SupportedContentTypesEnum {
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_JPG = 'image/jpg',
  IMAGE_PNG = 'image/png',
  VIDEO_MP4 = 'video/mp4',
  TEXT_CSV = 'text/csv',
  APPLICATION_PDF = 'application/pdf'
}

export const SupportedContentTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'text/csv'
] as const;
export type SupportedContentType = (typeof SupportedContentTypes)[number];

export const ThesisSupportedContentTypes = [
  'application/pdf',
  'text/csv'
] as const;
export type ThesisSupportedContentType =
  (typeof ThesisSupportedContentTypes)[number];

export interface GetDownloadSignedURLRequest {
  Bucket: string;
  Key: string;
  Expires: number;
}

export interface PutObjectRequest {
  Bucket: string;
  Key: string;
  ContentType: SupportedContentType;
  Expires: number;
}

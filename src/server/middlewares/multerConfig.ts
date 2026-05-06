// upload.ts
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '@app/common/services/logger';

const storage = multer.memoryStorage();
const uploadInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

export function upload(req: Request, res: Response, next: NextFunction): void {
  // Calling the multer middleware for a single file field named 'file'
  uploadInstance.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.jSend.error(
            null,
            'File size exceeds 5MB limit',
            StatusCodes.REQUEST_TOO_LONG
          );
        }
        return res.jSend.error(null, err.message, StatusCodes.BAD_REQUEST);
      }

      // For Unexpected error log and respond with 500
      logger.error(err, 'Multer upload middleware error');
      return res.jSend.error(
        null,
        'Internal Server Error',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Upload successful – file is now in req.file
    next();
  });
}

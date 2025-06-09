// // src/middlewares/error.middleware.ts
// import { Request, Response, NextFunction } from 'express';
// import multer from 'multer';

// export const handleUploadErrors = (
//   err: Error,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (err instanceof multer.MulterError) {
//     return res.status(400).json({
//       error: 'File upload error',
//       message: err.message
//     });
//   }
//   next(err);
// };

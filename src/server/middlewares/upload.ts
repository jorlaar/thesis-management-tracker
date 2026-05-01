import multer from 'multer';
import { RequestHandler, Request } from 'express';

// Configure Multer
const storage = multer.memoryStorage(); // Store files in memory

const fileFilter = (
  req: Request,  // This is the correct Request type from express
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents (.doc, .docx) are allowed!'));
  }
};

// Initialize Multer with config
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// Middleware for single file upload
export const uploadSingleFile = (fieldName: string): RequestHandler => {
  return upload.single(fieldName);
};

// Middleware for multiple files
export const uploadMultipleFiles = (
  fieldName: string,
  maxCount?: number
): RequestHandler => {
  return upload.array(fieldName, maxCount);
};

// src/middlewares/file-upload.middleware.ts
// import multer from 'multer';
// import Busboy from 'busboy';
// import { Request, Response, NextFunction } from 'express';
// // import { generateUlid } from '@app/server/utils/miscellaneous';

// // Multer configuration
// const multerUpload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//     files: 1 // Single file
//   },
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = [
//       'application/pdf',
//       'application/msword',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ];
//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
//     }
//   }
// });

// // Multer middleware for single file upload
// export const multerMiddleware = multerUpload.single('file');

// // Busboy middleware alternative
// export const busboyMiddleware = (req: Request, res: Response, next: NextFunction) => {
//   if (!req.headers['content-type']?.includes('multipart/form-data')) {
//     return next();
//   }

//   const busboy = Busboy({ headers: req.headers });
//   const fileData: {
//     buffer: Buffer;
//     mimetype: string;
//     originalname: string;
//   } = {
//     buffer: Buffer.alloc(0),
//     mimetype: '',
//     originalname: ''
//   };

//   busboy.on('file', (name, file, info) => {
//     const { filename, mimeType } = info;
//     fileData.originalname = filename;
//     fileData.mimetype = mimeType;

//     const chunks: Buffer[] = [];
//     file.on('data', (chunk) => chunks.push(chunk));
//     file.on('end', () => {
//       fileData.buffer = Buffer.concat(chunks);
//     });
//   });

//   busboy.on('field', (name, value) => {
//     req.body[name] = value;
//   });

//   busboy.on('finish', () => {
//     if (fileData.buffer.length > 0) {
//       req.file = {
//         fieldname: 'file',
//         originalname: fileData.originalname,
//         encoding: '7bit',
//         mimetype: fileData.mimetype,
//         buffer: fileData.buffer,
//         size: fileData.buffer.length,
//         // These are required by Multer's typings but not used
//         stream: null as any,
//         destination: '',
//         filename: '',
//         path: ''
//       };
//     }
//     next();
//   });

//   busboy.on('error', (err) => {
//     next(err);
//   });

//   req.pipe(busboy);
// };

// // Combined middleware that tries Multer first, falls back to Busboy
// export const fileUploadMiddleware = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (req.headers['content-type']?.includes('multipart/form-data')) {
//     // Try Multer first
//     multerMiddleware(req, res, (err) => {
//       if (err) {
//         // If Multer fails, try Busboy
//         busboyMiddleware(req, res, next);
//       } else {
//         next();
//       }
//     });
//   } else {
//     next();
//   }
// };
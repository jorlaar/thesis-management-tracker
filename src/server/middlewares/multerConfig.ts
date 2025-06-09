import multer from 'multer';

// Configure storage (you can customize this)
const storage = multer.memoryStorage(); // Stores files in memory as Buffer objects

// Create Multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

export default upload;
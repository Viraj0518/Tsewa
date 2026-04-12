import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const photoStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, path.resolve(env.UPLOAD_DIR, 'photos'));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const voiceStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, path.resolve(env.UPLOAD_DIR, 'voice'));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const VOICE_MIMES = ['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3', 'audio/webm'];

function photoFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (PHOTO_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  }
}

function voiceFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (VOICE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only M4A, MP3, and WebM audio files are allowed'));
  }
}

export const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: photoFileFilter,
});

export const voiceUpload = multer({
  storage: voiceStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: voiceFileFilter,
});

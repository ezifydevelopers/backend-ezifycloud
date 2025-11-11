import path from 'path';
import fs from 'fs';

/**
 * File storage operations - functional approach
 */
export interface FileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const saveFile = (itemId: string, file: FileLike): string => {
  const uploadDir = path.join(process.cwd(), 'uploads', itemId);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${timestamp}_${sanitizedOriginalName}`;
  const filePath = path.join(uploadDir, uniqueFileName);

  fs.writeFileSync(filePath, file.buffer);

  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
};

export const deleteFileFromDisk = (filePath: string): void => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

export const getFileStream = (filePath: string) => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found on disk');
  }
  return fs.createReadStream(fullPath);
};


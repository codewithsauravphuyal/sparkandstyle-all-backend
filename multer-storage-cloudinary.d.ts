declare module 'multer-storage-cloudinary' {
  import { StorageEngine } from 'multer';
  
  interface CloudinaryStorageOptions {
    cloudinary: any;
    params: {
      folder?: string;
      format?: (req: any, file: Express.Multer.File) => string;
      public_id?: (req: any, file: Express.Multer.File) => string;
      resource_type?: string;
      allowed_formats?: string[];
      [key: string]: any;
    };
  }
  
  interface CloudinaryStorageConstructor {
    new (options: CloudinaryStorageOptions): StorageEngine;
  }
  
  const CloudinaryStorage: CloudinaryStorageConstructor;
  export default CloudinaryStorage;
}

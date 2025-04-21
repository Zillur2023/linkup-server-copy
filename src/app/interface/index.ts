import { JwtPayload } from "jsonwebtoken";


declare global {
    namespace Express {
      interface Request {
        user: JwtPayload;
        file?: Multer.File; // For single file upload
        // files?: Multer.File[]; // For multiple file uploads (optional)
      }
    }
  }
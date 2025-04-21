import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

const notFound = (req: Request, res: Response, next: NextFunction): void => {
   res.status(httpStatus.NOT_FOUND).json({
    success: false,
    statusCode: 401,
    message: "API Not Found !!",
  });
};

export default notFound;
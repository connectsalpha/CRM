import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  console.error('==================================================');
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.error(err.stack || err);
  console.error('==================================================');

  const statusCode = err.status || err.statusCode || 500;

  let message = 'Internal Server Error';
  if (statusCode < 500 && err.message) {
    message = err.message;
  }

  return res.status(statusCode).json({
    error: message,
  });
};

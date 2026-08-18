import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          formattedErrors[path] = err.message;
        });
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Validation failed',
          errors: formattedErrors,
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

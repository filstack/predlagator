// backend/src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

/**
 * AB>G=8:8 40==KE 4;O 20;840F88
 */
export type ValidationSource = 'body' | 'query' | 'params'

/**
 * Middleware 4;O 20;840F88 40==KE 70?@>A0 A ?><>ILN Zod AE5<
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // K18@05< 8AB>G=8: 40==KE
      let data: any
      switch (source) {
        case 'body':
          data = req.body
          break
        case 'query':
          data = req.query
          break
        case 'params':
          data = req.params
          break
      }

      // 0;848@C5< 40==K5
      const validatedData = schema.parse(data)

      // 0<5=O5< 8AE>4=K5 40==K5 20;848@>20==K<8 (A ?@5>1@07>20=8O<8 B8?>2)
      switch (source) {
        case 'body':
          req.body = validatedData
          break
        case 'query':
          req.query = validatedData
          break
        case 'params':
          req.params = validatedData
          break
      }

      next()
    } catch (error) {
      // ZodError 1C45B >1@01>B0= 2 error-handler middleware
      next(error)
    }
  }
}

/**
 * 0;840F8O =5A:>;L:8E 8AB>G=8:>2 >4=>2@5<5==>
 */
export function validateMultiple(schemas: {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 0;848@C5< body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body)
      }

      // 0;848@C5< query
      if (schemas.query) {
        req.query = schemas.query.parse(req.query)
      }

      // 0;848@C5< params
      if (schemas.params) {
        req.params = schemas.params.parse(req.params)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * #B8;8B0 4;O 157>?0A=>9 20;840F88 157 ?@5@K20=8O ?>B>:0
 */
export async function validateSafe<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: ZodError }> {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error }
    }
    throw error
  }
}

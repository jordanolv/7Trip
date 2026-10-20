import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ApiErrorCode, type ApiErrorBody } from '@7trip/shared';
import type { z } from 'zod';

/** Validates (and transforms) a request body with a shared Zod schema. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    const body: ApiErrorBody = {
      code: ApiErrorCode.ValidationFailed,
      message: Object.values(fields)[0] ?? 'Requête invalide',
      fields,
    };
    throw new BadRequestException(body);
  }
}

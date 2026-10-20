import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@7trip/shared';

/** HTTP error with the `{ code, message }` body the apps rely on. */
export function apiError(status: HttpStatus, code: ApiErrorCode, message: string): HttpException {
  const body: ApiErrorBody = { code, message };
  return new HttpException(body, status);
}

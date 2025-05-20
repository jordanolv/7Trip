import { registerAs } from '@nestjs/config';
import { JwtSignOptions } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

const logger = new Logger('RefreshJwtConfig');

export default registerAs('refresh-jwt', (): JwtSignOptions => {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRE_IN;

  logger.debug(
    `Loading Refresh JWT config - Secret: ${secret ? 'Set' : 'Not set'}, ExpiresIn: ${expiresIn}`,
  );

  if (!secret) {
    logger.error('JWT_REFRESH_SECRET is not set in environment variables');
    throw new Error('JWT_REFRESH_SECRET is required');
  }

  return {
    secret,
    expiresIn: expiresIn || '7d',
  };
});

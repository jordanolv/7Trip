import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

const logger = new Logger('JwtConfig');

export default registerAs('jwt', (): JwtModuleOptions => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE_IN;

  logger.debug(
    `Loading JWT config - Secret: ${secret ? 'Set' : 'Not set'}, ExpiresIn: ${expiresIn}`,
  );

  if (!secret) {
    logger.error('JWT_SECRET is not set in environment variables');
    throw new Error('JWT_SECRET is required');
  }

  return {
    secret,
    signOptions: {
      expiresIn: expiresIn || '15m',
    },
  };
});

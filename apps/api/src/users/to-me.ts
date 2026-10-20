import type { Me } from '@7trip/shared';
import type { User } from '../generated/prisma/client.js';

export function toMe(user: User): Me {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

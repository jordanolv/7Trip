import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Argon2id with the OWASP-recommended minimum parameters (19 MiB, 2 iterations, 1 lane).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService {
  /** Used when the account does not exist, so a login takes the same time either way. */
  private readonly dummyHash = hash('timing-equaliser', OPTIONS);

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string | null | undefined, password: string): Promise<boolean> {
    if (!passwordHash) {
      await verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return verify(passwordHash, password).catch(() => false);
  }
}

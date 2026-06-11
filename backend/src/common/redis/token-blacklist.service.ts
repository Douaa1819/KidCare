import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const KEY_PREFIX = 'jwt:bl:';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  /** jti encore révoqué ? */
  async isBlacklisted(jti: string | undefined): Promise<boolean> {
    if (!jti || !this.redis.isReady) return false;
    const v = await this.redis.get(`${KEY_PREFIX}${jti}`);
    return v !== null && v !== undefined;
  }

  /**
   * Invalide un jeton jusqu’à son exp (epoch sec).
   */
  async revokeUntil(jti: string, expSec: number): Promise<void> {
    if (!jti || !this.redis.isReady) return;
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, expSec - now);
    await this.redis.setex(`${KEY_PREFIX}${jti}`, ttl, '1');
  }
}

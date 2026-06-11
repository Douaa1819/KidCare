import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'REDIS_URL absente — blacklist de révocation JWT désactivée (acceptable en dev uniquement)',
      );
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
    } catch (e) {
      this.logger.error(`Redis init: ${(e as Error).message}`);
    }
  }

  get isReady(): boolean {
    return this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (e) {
      this.logger.warn(`Redis get ${key}: ${(e as Error).message}`);
      return null;
    }
  }

  /** TTL en secondes. */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch (e) {
      this.logger.warn(`Redis setex ${key}: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }
}

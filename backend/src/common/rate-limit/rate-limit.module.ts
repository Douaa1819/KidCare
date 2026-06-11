import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

const ttl = parseInt(process.env.THROTTLE_TTL ?? '60000', 10);
const defaultLimit = parseInt(process.env.THROTTLE_LIMIT ?? '20', 10);
const authLimit = parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10);
const uploadLimit = parseInt(process.env.THROTTLE_UPLOAD_LIMIT ?? '15', 10);

/**
 * Rate-limiting par IP — profils default / auth / upload.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl, limit: defaultLimit },
      { name: 'auth', ttl, limit: authLimit },
      { name: 'upload', ttl, limit: uploadLimit },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}


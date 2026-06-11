import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, TokenBlacklistService],
  exports: [RedisService, TokenBlacklistService],
})
export class RedisModule {}

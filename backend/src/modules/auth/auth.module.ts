import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../../common/email/email.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [EmailModule, PlatformModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}


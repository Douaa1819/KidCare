import { Module } from '@nestjs/common';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { EmailService } from '../../common/services/email.service';
import { AuditService } from './audit.service';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, AuditService, SuperAdminGuard, EmailService],
  exports: [AuditService, PlatformService],
})
export class PlatformModule {}

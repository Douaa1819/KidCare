import { Module } from '@nestjs/common';
import { InscriptionsService } from './inscriptions.service';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsAdminController } from './inscriptions-admin.controller';
import { InscriptionsAcceptService } from './inscriptions-accept.service';
import { InscriptionsAcceptController } from './inscriptions-accept.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../common/email/email.module';
import { PlatformModule } from '../platform/platform.module';

/**
 * Module pour les inscriptions (publiques et admin)
 */
@Module({
  imports: [PrismaModule, EmailModule, PlatformModule],
  controllers: [InscriptionsController, InscriptionsAdminController, InscriptionsAcceptController],
  providers: [InscriptionsService, InscriptionsAcceptService],
  exports: [InscriptionsService, InscriptionsAcceptService],
})
export class InscriptionsModule {}


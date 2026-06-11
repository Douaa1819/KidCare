import { Module } from '@nestjs/common';
import { PresencesController } from './presences.controller';
import { PresencesService } from './presences.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PresencesController],
  providers: [PresencesService],
  exports: [PresencesService],
})
export class PresencesModule {}


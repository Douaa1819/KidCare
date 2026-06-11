import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../common/mail/mail.module';
import { NotificationRecipientsService } from './notification-recipients.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationRecipientsService, NotificationDispatcherService],
  exports: [NotificationDispatcherService, NotificationRecipientsService],
})
export class NotificationsModule {}

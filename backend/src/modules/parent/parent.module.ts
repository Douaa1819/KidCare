import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClassActivityPhotosModule } from '../class-activity-photos/class-activity-photos.module';
import { EnfantsModule } from '../enfants/enfants.module';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';

@Module({
  imports: [PrismaModule, ClassActivityPhotosModule, EnfantsModule],
  controllers: [ParentController],
  providers: [ParentService],
  exports: [ParentService],
})
export class ParentModule {}


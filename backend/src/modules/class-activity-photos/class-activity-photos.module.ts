import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClassActivityPhotosController } from './class-activity-photos.controller';
import { ClassActivityPhotosService } from './class-activity-photos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClassActivityPhotosController],
  providers: [ClassActivityPhotosService],
  exports: [ClassActivityPhotosService],
})
export class ClassActivityPhotosModule {}

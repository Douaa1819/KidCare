import { Module } from '@nestjs/common';
import { AdminEnfantsController } from './admin-enfants.controller';
import { EnfantsService } from './enfants.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [AdminEnfantsController],
  providers: [EnfantsService],
  imports: [PrismaModule],
  exports: [EnfantsService],
})
export class EnfantsModule {}

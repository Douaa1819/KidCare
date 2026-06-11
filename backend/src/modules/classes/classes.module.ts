import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicClassesController } from './public-classes.controller';
import { PublicChildAgeController } from './public-child-age.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClassesController, PublicClassesController, PublicChildAgeController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
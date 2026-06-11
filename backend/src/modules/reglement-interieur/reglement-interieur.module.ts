import { Module } from '@nestjs/common';
import { ReglementInterieurController } from './reglement-interieur.controller';
import { ReglementInterieurService } from './reglement-interieur.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReglementInterieurController],
  providers: [ReglementInterieurService],
  exports: [ReglementInterieurService],
})
export class ReglementInterieurModule {}

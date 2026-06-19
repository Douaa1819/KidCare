import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toUtcMidnightForCalendarDate } from '../../common/calendar-date';
import {
  assertAllowedStoredImageMime,
  isValidCalendarDateYmd,
  validateActivityPhotoUpload,
} from '../../common/validators/image-upload.validation';
import { ListActivityPhotosQueryDto } from './dto/list-activity-photos.query.dto';
import { UploadActivityPhotoBodyDto } from './dto/upload-activity-photo.dto';

@Injectable()
export class ClassActivityPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTeacherOrAdminOnClasse(
    utilisateurId: string,
    role: string,
    classeId: string,
  ): Promise<void> {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const exists = await this.prisma.classe.findUnique({
        where: { id: classeId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Classe introuvable');
      return;
    }
    if (role !== 'ENSEIGNANT') {
      throw new ForbiddenException('Accès refusé');
    }
    const enseignant = await this.prisma.enseignant.findFirst({
      where: { utilisateur: { id: utilisateurId } },
    });
    if (!enseignant) {
      throw new ForbiddenException('Enseignant introuvable');
    }
    const link = await this.prisma.enseignantClasse.findFirst({
      where: { enseignantId: enseignant.id, classeId },
    });
    if (!link) {
      throw new ForbiddenException("Vous n'enseignez pas dans cette classe");
    }
  }

  private async assertParentChildInClasse(
    utilisateurId: string,
    classeId: string,
  ): Promise<void> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        tuteur: {
          include: {
            famille: { include: { enfants: true } },
          },
        },
      },
    });
    if (!utilisateur?.tuteur) {
      throw new ForbiddenException('Tuteur introuvable');
    }
    const enfants = utilisateur.tuteur.famille?.enfants ?? [];
    const ok = enfants.some((e) => e.classeId === classeId);
    if (!ok) {
      throw new ForbiddenException("Aucun enfant dans cette classe");
    }
  }

  async listForUser(
    utilisateurId: string,
    role: string,
    query: ListActivityPhotosQueryDto,
  ) {
    const { classeId, date, dateFrom, dateTo, page = 1, limit = 50 } = query;

    if (role === 'PARENT') {
      await this.assertParentChildInClasse(utilisateurId, classeId);
    } else {
      await this.assertTeacherOrAdminOnClasse(utilisateurId, role, classeId);
    }

    const where: { classeId: string; date?: object } = { classeId };

    if (date) {
      if (!isValidCalendarDateYmd(date)) {
        throw new BadRequestException('Date invalide');
      }
      try {
        const d = toUtcMidnightForCalendarDate(date);
        const next = new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate() + 1,
            0,
            0,
            0,
            0,
          ),
        );
        where.date = { gte: d, lt: next };
      } catch {
        throw new BadRequestException('Date invalide');
      }
    } else if (dateFrom || dateTo) {
      const from = dateFrom ?? dateTo!;
      const to = dateTo ?? dateFrom!;
      if (!isValidCalendarDateYmd(from) || !isValidCalendarDateYmd(to)) {
        throw new BadRequestException('Période invalide');
      }
      try {
        const start = toUtcMidnightForCalendarDate(from);
        const endDay = toUtcMidnightForCalendarDate(to);
        const endExclusive = new Date(
          Date.UTC(
            endDay.getUTCFullYear(),
            endDay.getUTCMonth(),
            endDay.getUTCDate() + 1,
            0,
            0,
            0,
            0,
          ),
        );
        where.date = { gte: start, lt: endExclusive };
      } catch {
        throw new BadRequestException('Période invalide');
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [total, rows] = await Promise.all([
      this.prisma.classActivityPhoto.count({ where }),
      this.prisma.classActivityPhoto.findMany({
        where,
        orderBy: [{ date: 'desc' }, { creeLe: 'desc' }],
        skip,
        take: safeLimit,
        select: {
          id: true,
          classeId: true,
          date: true,
          mimeType: true,
          legende: true,
          creeLe: true,
        },
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        classeId: r.classeId,
        date: r.date.toISOString(),
        mimeType: r.mimeType,
        legende: r.legende,
        creeLe: r.creeLe.toISOString(),
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit) || 0,
      },
    };
  }

  async getFileContent(
    utilisateurId: string,
    role: string,
    id: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const row = await this.prisma.classActivityPhoto.findUnique({
      where: { id },
      select: {
        classeId: true,
        imageData: true,
        mimeType: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Photo introuvable');
    }
    if (role === 'PARENT') {
      await this.assertParentChildInClasse(utilisateurId, row.classeId);
    } else {
      await this.assertTeacherOrAdminOnClasse(
        utilisateurId,
        role,
        row.classeId,
      );
    }
    const mimeType = assertAllowedStoredImageMime(row.mimeType);
    return {
      buffer: Buffer.from(row.imageData),
      mimeType,
    };
  }

  async upload(
    utilisateurId: string,
    role: string,
    body: UploadActivityPhotoBodyDto,
    file: Express.Multer.File | undefined,
  ) {
    const { mimeType } = validateActivityPhotoUpload(file);
    await this.assertTeacherOrAdminOnClasse(
      utilisateurId,
      role,
      body.classeId,
    );

    const dateYmd = body.date.trim();
    if (!isValidCalendarDateYmd(dateYmd)) {
      throw new BadRequestException('Date invalide');
    }

    let day: Date;
    try {
      day = toUtcMidnightForCalendarDate(dateYmd);
    } catch {
      throw new BadRequestException('Date invalide');
    }

    const row = await this.prisma.classActivityPhoto.create({
      data: {
        classeId: body.classeId,
        date: day,
        imageData: file!.buffer,
        mimeType,
        legende: body.legende?.trim() || null,
        creeParId: utilisateurId,
      },
      select: {
        id: true,
        classeId: true,
        date: true,
        mimeType: true,
        legende: true,
        creeLe: true,
      },
    });

    return {
      id: row.id,
      classeId: row.classeId,
      date: row.date.toISOString(),
      mimeType: row.mimeType,
      legende: row.legende,
      creeLe: row.creeLe.toISOString(),
    };
  }

  async deletePhoto(utilisateurId: string, role: string, id: string) {
    const row = await this.prisma.classActivityPhoto.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Photo introuvable');
    }
    await this.assertTeacherOrAdminOnClasse(
      utilisateurId,
      role,
      row.classeId,
    );

    await this.prisma.classActivityPhoto.delete({ where: { id } });
    return { ok: true as const };
  }
}

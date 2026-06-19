import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Event } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, ListEventsQueryDto } from './dto';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  private toEventResponse(event: Event) {
    return {
      id: event.id,
      titre: event.titre,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      classeId: event.classeId,
      status: event.status ?? 'PUBLISHED',
      cost: event.cost === null ? null : Number(event.cost),
      currency: event.currency,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  /**
   * Crée un nouvel événement
   */
  async createEvent(dto: CreateEventDto) {
    // Vérifier que la classe existe
    const classe = await this.prisma.classe.findUnique({
      where: { id: dto.classeId },
    });

    if (!classe) {
      throw new NotFoundException('Classe non trouvée');
    }

    // Vérifier que startAt < endAt
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('startAt doit être avant endAt');
    }

    const cost =
      dto.cost === undefined || dto.cost === null ? null : Number(dto.cost);
    const currency = cost === null ? undefined : (dto.currency ?? 'MAD');

    const event = await this.prisma.event.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        startAt,
        endAt,
        classeId: dto.classeId,
        cost,
        currency,
        status: 'PUBLISHED',
      },
    });

    void this.notificationDispatcher
      .notifyNewClassEvent({
        classeId: event.classeId,
        classeNom: classe.nom,
        titre: event.titre,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Email notification événement: ${msg}`);
      });

    return this.toEventResponse(event);
  }

  /**
   * Met à jour un événement
   */
  async updateEvent(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Impossible de modifier un événement annulé');
    }

    if (dto.classeId !== undefined) {
      const classe = await this.prisma.classe.findUnique({
        where: { id: dto.classeId },
      });
      if (!classe) {
        throw new NotFoundException('Classe non trouvée');
      }
    }

    // Vérifier les dates si elles sont fournies
    if (dto.startAt && dto.endAt) {
      const startAt = new Date(dto.startAt);
      const endAt = new Date(dto.endAt);

      if (startAt >= endAt) {
        throw new BadRequestException('startAt doit être avant endAt');
      }
    }

    let cost = event.cost;
    let currency: string | undefined = event.currency;
    if (dto.cost !== undefined) {
      const parsedCost =
        dto.cost === null ? null : Number(dto.cost);
      cost = parsedCost as typeof cost;
      currency =
        parsedCost === null
          ? undefined
          : (dto.currency ?? event.currency ?? 'MAD');
    } else if (dto.currency !== undefined) {
      currency = dto.currency;
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: {
        titre: dto.titre ?? event.titre,
        description: dto.description ?? event.description,
        startAt: dto.startAt ? new Date(dto.startAt) : event.startAt,
        endAt: dto.endAt ? new Date(dto.endAt) : event.endAt,
        classeId: dto.classeId ?? event.classeId,
        cost,
        currency,
      },
    });

    return this.toEventResponse(updatedEvent);
  }

  /**
   * Annule un événement publié et notifie les parents par email.
   */
  async cancelEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { classe: { select: { nom: true } } },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Cet événement est déjà annulé');
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    void this.notificationDispatcher
      .notifyClassEventCancelled({
        classeId: event.classeId,
        classeNom: event.classe.nom,
        titre: event.titre,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Email annulation événement: ${msg}`);
      });

    return this.toEventResponse(updatedEvent);
  }

  /**
   * Supprime un événement
   */
  async deleteEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Événement supprimé avec succès' };
  }

  /**
   * Liste les événements avec filtres et pagination
   */
  async listEvents(query: ListEventsQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.classeId) {
      where.classeId = query.classeId;
    }

    if (query.dateMin) {
      where.startAt = { gte: new Date(query.dateMin) };
    }

    if (query.dateMax) {
      where.endAt = { ...where.endAt, lte: new Date(query.dateMax) };
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        ...this.toEventResponse(e),
      })),
      pagination: {
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total,
      },
    };
  }

  /**
   * Récupère un événement par ID
   */
  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    return this.toEventResponse(event);
  }
}


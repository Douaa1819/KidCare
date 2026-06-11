import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditContext = {
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    ctx: AuditContext,
    entity?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          entity,
          entityId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit log failed: ${action} — ${(err as Error).message}`);
    }
  }

  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    userId?: string;
    q?: string;
    from?: string;
    to?: string;
  }) {
    const page = Number(params.page ?? 1);
    const limit = Math.min(Number(params.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = params.userId;

    if (params.q) {
      where.OR = [
        { userEmail: { contains: params.q, mode: 'insensitive' } },
        { action: { contains: params.q, mode: 'insensitive' } },
        { entity: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    if (params.from || params.to) {
      where.creeLe = {};
      if (params.from) where.creeLe.gte = new Date(params.from);
      if (params.to) where.creeLe.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creeLe: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  MenuResponseDto,
  GetMenusQueryDto,
} from './dto';
import { StatutMenu } from '@prisma/client';

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Créer un nouveau menu
   */
  async create(
    createMenuDto: CreateMenuDto,
    userId: string,
  ): Promise<MenuResponseDto> {
    try {
      // Vérifier qu'il n'existe pas déjà un menu pour cette date
      const existingMenu = await this.prisma.menu.findUnique({
        where: { date: new Date(createMenuDto.date) },
      });

      if (existingMenu) {
        throw new BadRequestException(
          `Un menu existe déjà pour la date ${createMenuDto.date}`,
        );
      }

      // Créer le menu
      const menu = await this.prisma.menu.create({
        data: {
          date: new Date(createMenuDto.date),
          collationMatin: createMenuDto.collationMatin,
          repas: createMenuDto.repas,
          gouter: createMenuDto.gouter,
          statut: StatutMenu.Brouillon,
          creePar: userId,
          allergenes: {
            create: (createMenuDto.allergenes || []).map((allergen) => ({
              allergen,
            })),
          },
        },
        include: {
          allergenes: true,
        },
      });

      return this.formatMenuResponse(menu);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création du menu: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du menu');
    }
  }

  /**
   * Récupérer tous les menus avec filtres et pagination
   */
  async findAll(
    query: GetMenusQueryDto,
    userRole: string,
  ): Promise<{
    data: MenuResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(query.pageSize || 25, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Parents/enseignants → uniquement les menus publiés
    if (userRole === 'PARENT' || userRole === 'ENSEIGNANT') {
      where.statut = StatutMenu.Publie;
    } else if (query.statut) {
      where.statut = query.statut;
    }

    if (query.date) {
      const date = new Date(query.date);
      where.date = {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() + 1,
        ),
      };
    } else if (query.dateMin || query.dateMax) {
      where.date = {};
      if (query.dateMin) {
        where.date.gte = new Date(query.dateMin);
      }
      if (query.dateMax) {
        where.date.lt = new Date(
          new Date(query.dateMax).getTime() + 24 * 60 * 60 * 1000,
        );
      }
    }

    const [menus, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        include: {
          allergenes: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.menu.count({ where }),
    ]);

    return {
      data: menus.map((menu) => this.formatMenuResponse(menu)),
      total,
      page,
      pageSize,
      hasNext: skip + pageSize < total,
    };
  }

  /**
   * Récupérer un menu par ID
   */
  async findOne(id: string): Promise<MenuResponseDto> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        allergenes: true,
      },
    });

    if (!menu) {
      throw new NotFoundException(`Menu ${id} non trouvé`);
    }

    return this.formatMenuResponse(menu);
  }

  /**
   * Récupérer le menu du jour
   */
  async getTodayMenu(): Promise<MenuResponseDto | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const menu = await this.prisma.menu.findUnique({
      where: { date: today },
      include: {
        allergenes: true,
      },
    });

    if (!menu) {
      return null;
    }

    return this.formatMenuResponse(menu);
  }

  /**
   * Mettre à jour un menu
   */
  async update(
    id: string,
    updateMenuDto: UpdateMenuDto,
  ): Promise<MenuResponseDto> {
    const menu = await this.findOne(id);

    try {
      if (updateMenuDto.allergenes) {
        await this.prisma.menuAllergen.deleteMany({
          where: { menuId: id },
        });
      }

      const updatedMenu = await this.prisma.menu.update({
        where: { id },
        data: {
          collationMatin:
            updateMenuDto.collationMatin ?? (menu as any).collationMatin,
          repas: updateMenuDto.repas ?? (menu as any).repas,
          gouter: updateMenuDto.gouter ?? (menu as any).gouter,
          statut: updateMenuDto.statut ?? menu.statut,
          allergenes: updateMenuDto.allergenes
            ? {
                create: updateMenuDto.allergenes.map((allergen) => ({
                  allergen,
                })),
              }
            : undefined,
        },
        include: {
          allergenes: true,
        },
      });

      this.logger.log(`Menu ${id} mis à jour`);
      return this.formatMenuResponse(updatedMenu);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la mise à jour du menu: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new BadRequestException('Erreur lors de la mise à jour du menu');
    }
  }

  /**
   * Publier un menu
   */
  async publish(id: string): Promise<MenuResponseDto> {
    const menu = await this.findOne(id);

    if (menu.statut === 'Publie') {
      throw new BadRequestException('Ce menu est déjà publié');
    }

    const publishedMenu = await this.prisma.menu.update({
      where: { id },
      data: {
        statut: StatutMenu.Publie,
        publieLe: new Date(),
      },
      include: {
        allergenes: true,
      },
    });

    this.logger.log(`Menu ${id} publié`);
    return this.formatMenuResponse(publishedMenu);
  }

  /**
   * Dépublier un menu (revenir à Brouillon pour pouvoir modifier/supprimer)
   */
  async unpublish(id: string): Promise<MenuResponseDto> {
    await this.findOne(id);
    const menu = await this.prisma.menu.update({
      where: { id },
      data: { statut: StatutMenu.Brouillon, publieLe: null },
      include: { allergenes: true },
    });
    this.logger.log(`Menu ${id} dépublié`);
    return this.formatMenuResponse(menu);
  }

  /**
   * Supprimer un menu
   */
  async remove(id: string): Promise<{ message: string }> {
    const menu = await this.findOne(id);

    if (menu.statut === 'Publie') {
      throw new BadRequestException(
        'Impossible de supprimer un menu publié',
      );
    }

    await this.prisma.menu.delete({
      where: { id },
    });

    this.logger.log(`Menu ${id} supprimé`);
    return { message: 'Menu supprimé avec succès' };
  }

  /**
   * Formater la réponse du menu
   */
  private formatMenuResponse(menu: any): MenuResponseDto {
    return {
      id: menu.id,
      date: menu.date.toISOString().split('T')[0],
      collationMatin: menu.collationMatin,
      repas: menu.repas,
      gouter: menu.gouter,
      statut: menu.statut,
      allergenes: menu.allergenes.map((a: any) => a.allergen),
      creePar: menu.creePar,
      creeLe: menu.creeLe.toISOString(),
      modifieLe: menu.modifieLe.toISOString(),
      publieLe: menu.publieLe ? menu.publieLe.toISOString() : null,
    };
  }
}

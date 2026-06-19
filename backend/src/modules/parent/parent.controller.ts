import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AllowedStatuses, Roles } from '../../common/decorators/roles.decorator';
import { ParentService } from './parent.service';
import { ClassActivityPhotosService } from '../class-activity-photos/class-activity-photos.service';
import { UpdateParentMeDto, GetPresencesQueryDto, GetEventsQueryDto, CreateParentEnfantDto } from './dto';
import { ParentActivityPhotosQueryDto } from './dto/parent-activity-photos.query.dto';

@ApiTags('Parent')
@Controller('parent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARENT')
@AllowedStatuses('ACTIVE', 'INVITED')
@ApiBearerAuth()
export class ParentController {
  private readonly logger = new Logger(ParentController.name);

  constructor(
    private readonly parentService: ParentService,
    private readonly classActivityPhotosService: ClassActivityPhotosService,
  ) {}

  private resolveUserId(req: { user?: { userId?: string }; utilisateur?: { id?: string } }): string {
    const id = req.utilisateur?.id ?? req.user?.userId;
    if (!id) {
      throw new UnauthorizedException('Session invalide — reconnectez-vous');
    }
    return id;
  }

  @Get('me')
  @ApiOperation({ summary: 'Récupérer mon profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil du tuteur avec ses enfants',
    schema: {
      example: {
        id: 'user_123',
        email: 'parent@example.com',
        prenom: 'Jean',
        nom: 'Dupont',
        telephone: '06 12 34 56 78',
        adresse: 'Rue Atlas, Marrakech',
        langue: 'fr',
        tuteurId: 'tuteur_123',
        familleId: 'fam_123',
        enfants: [
          {
            id: 'enf_1',
            prenom: 'Alice',
            nom: 'Dupont',
            dateNaissance: '2020-05-15',
            classeId: 'cls_1',
          },
        ],
      },
    },
  })
  async getMe(@Req() req: any) {
    const userId = this.resolveUserId(req);
    this.logger.debug(`GET /parent/me userId=${userId}`);
    return this.parentService.getMyProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Modifier mon profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    schema: {
      example: {
        id: 'tuteur_123',
        prenom: 'Jean',
        nom: 'Dupont',
        telephone: '06 12 34 56 78',
        adresse: 'Rue Atlas, Marrakech',
      },
    },
  })
  async updateMe(@Req() req: any, @Body() dto: UpdateParentMeDto) {
    return this.parentService.updateMyProfile(this.resolveUserId(req), dto);
  }

  @Post('enfants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter un enfant à ma famille (tuteur principal)' })
  @ApiResponse({ status: 201, description: 'Enfant créé et assigné à une classe' })
  async createChild(@Req() req: any, @Body() dto: CreateParentEnfantDto) {
    return this.parentService.createMyChild(this.resolveUserId(req), dto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe changé avec succès',
    schema: {
      example: {
        message: 'Mot de passe changé avec succès',
      },
    },
  })
  async changePassword(@Req() req: any, @Body() dto: any) {
    // TODO: Implémenter l'intégration Supabase
    return { message: 'Mot de passe changé avec succès' };
  }

  @Get('enfants/:enfantId/presences')
  @ApiOperation({ summary: 'Récupérer les présences de mon enfant' })
  @ApiResponse({
    status: 200,
    description: 'Liste des présences paginée',
    schema: {
      example: {
        data: [
          {
            id: 'pres_1',
            date: '2025-11-09',
            statut: 'Present',
            arriveeA: '08:30',
            departA: '17:00',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 30,
          total: 100,
          hasNext: true,
        },
      },
    },
  })
  async getChildPresences(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Query() query: GetPresencesQueryDto,
  ) {
    return this.parentService.getChildPresences(this.resolveUserId(req), enfantId, query);
  }

  @Get('classes/:classeId/journal/latest')
  @ApiOperation({ summary: 'Récupérer le dernier résumé publié de la classe (ou par date si fournie)' })
  @ApiResponse({
    status: 200,
    description: 'Dernier résumé publié',
    schema: {
      example: {
        id: 'journal_1',
        date: '2025-11-09',
        activites: 'Jeux libres, peinture',
        apprentissages: 'Couleurs, formes',
        humeurGroupe: 'Excellente',
        observations: 'Groupe très actif',
        publieLe: '2025-11-09T17:00:00Z',
      },
    },
  })
  async getLatestClassJournal(
    @Req() req: any,
    @Param('classeId') classeId: string,
    @Query('date') date?: string,
  ) {
    return this.parentService.getLatestClassJournal(this.resolveUserId(req), classeId, date);
  }

  @Get('classes/:classeId/activity-photos')
  @ApiOperation({
    summary: 'Photos des activités du jour (album de la classe)',
    description:
      'Plusieurs photos par jour. Filtres: date (jour précis), ou dateFrom + dateTo (période).',
  })
  @ApiResponse({ status: 200, description: 'Liste des photos' })
  async getClassActivityPhotos(
    @Req() req: any,
    @Param('classeId', ParseUUIDPipe) classeId: string,
    @Query() query: ParentActivityPhotosQueryDto,
  ) {
    return this.classActivityPhotosService.listForUser(
      this.resolveUserId(req),
      'PARENT',
      {
        classeId,
        date: query.date,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'Récupérer mes événements' })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements paginée',
    schema: {
      example: {
        data: [
          {
            id: 'evt_1',
            titre: 'Réunion parents-enseignants',
            description: 'Salle bleue',
            startAt: '2025-11-30T14:00:00Z',
            endAt: '2025-11-30T16:00:00Z',
            classeId: 'cls_1',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
        },
      },
    },
  })
  async getMyEvents(@Req() req: any, @Query() query: GetEventsQueryDto) {
    return this.parentService.getMyEvents(this.resolveUserId(req), query);
  }

  @Get('classes/:classeId/menu')
  @ApiOperation({ summary: 'Récupérer le menu du jour d\'une classe' })
  @ApiResponse({
    status: 200,
    description: 'Menu du jour publié',
    schema: {
      example: {
        id: 'menu_1',
        date: '2025-11-09',
        petit_dejeuner: 'Lait, pain, beurre',
        collation_matin: 'Fruit',
        dejeuner: 'Poulet, riz, légumes',
        collation_apres_midi: 'Yaourt',
        gouter: 'Gâteau, jus',
        notes: 'Aucune allergie',
        publieLe: '2025-11-09T08:00:00Z',
      },
    },
  })
  async getClassMenu(
    @Req() req: any,
    @Param('classeId') classeId: string,
    @Query('date') date?: string,
  ) {
    return this.parentService.getClassMenuOfDay(this.resolveUserId(req), classeId, date);
  }

  @Get('enfants/:enfantId/resume')
  @ApiOperation({ summary: 'Récupérer le résumé quotidien de mon enfant' })
  @ApiResponse({
    status: 200,
    description: 'Résumé du jour publié',
    schema: {
      example: {
        id: 'resume_1',
        date: '2025-11-09',
        humeur: 'Excellent',
        appetit: 'Bon',
        sieste: 'Excellent',
        participation: 'Excellent',
        activites: 'Jeux libres, peinture, chansons',
        observations: 'Très actif et joyeux',
        publieLe: '2025-11-09T17:00:00Z',
      },
    },
  })
  async getChildResume(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Query('date') date?: string,
  ) {
    return this.parentService.getChildDailyResume(this.resolveUserId(req), enfantId, date);
  }

  // ─────────────────────────── SANTÉ ───────────────────────────

  @Get('enfants/:enfantId/sante')
  @ApiOperation({ summary: 'Récupérer le profil santé de mon enfant' })
  async getChildSante(@Req() req: any, @Param('enfantId') enfantId: string) {
    return this.parentService.getChildSante(this.resolveUserId(req), enfantId);
  }

  @Put('enfants/:enfantId/sante')
  @ApiOperation({ summary: 'Créer ou mettre à jour le profil santé de mon enfant' })
  async upsertChildSante(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Body() dto: any,
  ) {
    return this.parentService.upsertChildSante(this.resolveUserId(req), enfantId, dto);
  }

  @Delete('enfants/:enfantId/sante')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer le profil santé de mon enfant' })
  async deleteChildSante(@Req() req: any, @Param('enfantId') enfantId: string) {
    return this.parentService.deleteChildSante(this.resolveUserId(req), enfantId);
  }

  // ─────────────────────────── DÉLÉGATIONS ───────────────────────────

  @Post('enfants/:enfantId/delegations')
  @ApiOperation({ summary: 'Ajouter une personne autorisée' })
  async addDelegation(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Body() dto: any,
  ) {
    return this.parentService.addDelegation(this.resolveUserId(req), enfantId, dto);
  }

  @Patch('enfants/:enfantId/delegations/:delegationId')
  @ApiOperation({ summary: 'Modifier une personne autorisée' })
  async updateDelegation(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Param('delegationId') delegationId: string,
    @Body() dto: any,
  ) {
    return this.parentService.updateDelegation(this.resolveUserId(req), enfantId, delegationId, dto);
  }

  @Delete('enfants/:enfantId/delegations/:delegationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une personne autorisée' })
  async deleteDelegation(
    @Req() req: any,
    @Param('enfantId') enfantId: string,
    @Param('delegationId') delegationId: string,
  ) {
    return this.parentService.deleteDelegation(this.resolveUserId(req), enfantId, delegationId);
  }
}


import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin/Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('presences')
  @ApiOperation({ summary: 'Statistiques de présences par jour' })
  @ApiQuery({ name: 'from', required: false, description: 'Date min (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date max (YYYY-MM-DD)' })
  async getPresences(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getPresences(from, to);
  }

  @Get('inscriptions')
  @ApiOperation({ summary: 'Statistiques des inscriptions par mois' })
  @ApiQuery({ name: 'year', required: false, description: 'Année (ex: 2025)', type: Number })
  async getInscriptions(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.dashboardService.getInscriptions(parsedYear);
  }

  @Get('upcoming-events')
  @ApiOperation({ summary: 'Événements à venir pour le dashboard admin' })
  @ApiQuery({ name: 'from', required: false, description: 'Date min ISO' })
  @ApiQuery({ name: 'to', required: false, description: 'Date max ISO' })
  async getUpcomingEvents(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getUpcomingEvents(from, to);
  }

  @Get('teacher-attendance-status')
  @ApiOperation({ summary: 'Statut de présence des enseignants par jour' })
  @ApiQuery({ name: 'from', required: false, description: 'Date min (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date max (YYYY-MM-DD)' })
  async getTeacherAttendanceStatus(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getTeacherAttendanceStatus(from, to);
  }
}

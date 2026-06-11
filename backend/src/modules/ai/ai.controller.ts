import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from './ai.service';
import {
  RewriteDailyMessageDto,
  RewriteDailyMessageResponseDto,
} from './dto/rewrite-daily-message.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('rewrite-daily-message')
  @HttpCode(HttpStatus.OK)
  @Roles('ENSEIGNANT', 'ADMIN')
  @ApiOperation({
    summary: 'Reformuler le message de la journée via IA',
    description:
      'Prend un texte brut et renvoie une version claire/professionnelle pour les parents.',
  })
  @ApiResponse({ status: 200, type: RewriteDailyMessageResponseDto })
  async rewriteDailyMessage(
    @Body() dto: RewriteDailyMessageDto,
  ): Promise<RewriteDailyMessageResponseDto> {
    const message = await this.aiService.rewriteDailyMessage(dto.text);
    return { message };
  }
}


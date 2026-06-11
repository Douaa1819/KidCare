import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { getChildAgePolicyFromEnv } from '../../common/child-age-policy';

@ApiTags('Public/Child age')
@Controller('public/child-age-policy')
export class PublicChildAgeController {
  @Get()
  @ApiOperation({ summary: 'Politique d’âge acceptée pour les enfants (années entières)' })
  @ApiResponse({ status: 200, description: 'Âge minimum et maximum en années' })
  getPolicy() {
    return getChildAgePolicyFromEnv();
  }
}

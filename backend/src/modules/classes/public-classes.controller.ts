import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';

@ApiTags('Public/Classes')
@Controller('public/classes')
export class PublicClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active classes (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of active classes',
  })
  findAllPublic() {
    return this.classesService.findAllPublic();
  }
}

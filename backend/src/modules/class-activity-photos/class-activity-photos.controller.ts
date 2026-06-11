import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ACTIVITY_PHOTO_MAX_BYTES,
  ACTIVITY_PHOTO_MIME_REGEX,
  SAFE_UPLOAD_FILENAME_REGEX,
} from '../../common/validators/image-upload.validation';
import { ClassActivityPhotosService } from './class-activity-photos.service';
import { ListActivityPhotosQueryDto } from './dto/list-activity-photos.query.dto';
import { UploadActivityPhotoBodyDto } from './dto/upload-activity-photo.dto';

const uploadLimits = {
  storage: memoryStorage(),
  limits: { fileSize: ACTIVITY_PHOTO_MAX_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const mime = (file.mimetype ?? '').toLowerCase().trim();
    if (!ACTIVITY_PHOTO_MIME_REGEX.test(mime === 'image/jpg' ? 'image/jpeg' : mime)) {
      cb(
        new BadRequestException(
          'Type de fichier non autorisé (jpeg, png, webp, gif uniquement)',
        ),
        false,
      );
      return;
    }
    const base = path.basename(file.originalname ?? '');
    if (base && !SAFE_UPLOAD_FILENAME_REGEX.test(base)) {
      cb(new BadRequestException('Nom de fichier non autorisé'), false);
      return;
    }
    cb(null, true);
  },
};

@ApiTags('Class activity photos')
@Controller('class-activity-photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassActivityPhotosController {
  constructor(private readonly service: ClassActivityPhotosService) {}

  @Get()
  @Roles('ENSEIGNANT', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister les photos d’activités (par classe / période)' })
  async list(@Query() query: ListActivityPhotosQueryDto, @Req() req: any) {
    const u = req.user;
    return this.service.listForUser(u.userId, u.role, query);
  }

  /** Fichier image (JWT requis — parents et enseignants autorisés selon la classe) */
  @Get(':id/file')
  @Roles('ENSEIGNANT', 'ADMIN', 'SUPER_ADMIN', 'PARENT')
  @ApiOperation({ summary: 'Télécharger le fichier image (octets)' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const u = req.user;
    const { buffer, mimeType } = await this.service.getFileContent(
      u.userId,
      u.role,
      id,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ upload: { limit: 15, ttl: 60000 } })
  @Roles('ENSEIGNANT', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Ajouter une photo d’activité (fichier + classeId + date)' })
  @UseInterceptors(FileInterceptor('file', uploadLimits))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadActivityPhotoBodyDto,
    @Req() req: any,
  ) {
    const u = req.user;
    return this.service.upload(u.userId, u.role, body, file);
  }

  @Delete(':id')
  @Roles('ENSEIGNANT', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une photo d’activité' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const u = req.user;
    return this.service.deletePhoto(u.userId, u.role, id);
  }
}

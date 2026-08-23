// src/app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ClassesModule } from './modules/classes/classes.module';
import { FamillesModule } from './modules/familles/familles.module';
import { InscriptionsModule } from './modules/inscriptions/inscriptions.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PresencesModule } from './modules/presences/presences.module';
import { MenusModule } from './modules/menus/menus.module';
import { DailyResumesModule } from './modules/daily-resumes/daily-resumes.module';
import { ClassDailySummariesModule } from './modules/class-daily-summaries/class-daily-summaries.module';
import { ParentModule } from './modules/parent/parent.module';
import { EventsModule } from './modules/events/events.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { CaptchaPlaceholderMiddleware } from './common/middlewares/captcha-placeholder.middleware';
import { EnfantsModule } from './modules/enfants/enfants.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReglementInterieurModule } from './modules/reglement-interieur/reglement-interieur.module';
import { ClassActivityPhotosModule } from './modules/class-activity-photos/class-activity-photos.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { PlatformModule } from './modules/platform/platform.module';
import { RedisModule } from './common/redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { SanitizeJsonBodyInterceptor } from './common/interceptors/sanitize-json-body.interceptor';
import { DevRequestTimingInterceptor } from './common/interceptors/dev-request-timing.interceptor';

@Module({
  imports: [
    // .env.local overrides .env (local Docker Postgres, etc.)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RateLimitModule,
    RedisModule,
    ClassesModule,
    FamillesModule,
    InscriptionsModule,
    AuthModule,
    UsersModule,
    PresencesModule,
    MenusModule,
    DailyResumesModule,
    ClassDailySummariesModule,
    ParentModule,
    EnfantsModule,
    EventsModule,
    DashboardModule,
    ReglementInterieurModule,
    ClassActivityPhotosModule,
    NotificationsModule,
    AiModule,
    PlatformModule,
  ],
  providers: [
    JwtAuthGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeJsonBodyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DevRequestTimingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Appliquer le middleware captcha placeholder sur /api/public/inscriptions
    consumer
      .apply(CaptchaPlaceholderMiddleware)
      .forRoutes('api/public/inscriptions');
  }
}

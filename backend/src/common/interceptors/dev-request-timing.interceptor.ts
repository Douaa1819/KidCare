import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Logs slow API requests in development only. */
@Injectable()
export class DevRequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestTiming');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
    const started = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        if (ms >= 300) {
          this.logger.warn(`${req.method ?? 'GET'} ${req.url ?? ''} ${ms}ms`);
        }
      }),
    );
  }
}

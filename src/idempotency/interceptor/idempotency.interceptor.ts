import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';
import { IdempotencyService } from '../idempotency.service';
import { Request } from 'express';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  constructor(private readonly idempotency: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as string;
    if (!idempotencyKey)
      throw new BadRequestException('Missing idempotency key from the headers');

    const claimedKey = await this.idempotency.claim(idempotencyKey);

    if (claimedKey === 'claimed') {
      return next.handle().pipe(
        tap((responseBody) => {
          this.idempotency
            .complete(idempotencyKey, responseBody)
            .catch((err) => {
              this.logger.error(
                `Failed to complete idempotency record for ${idempotencyKey}`,
                err,
              );
            });
        }),
      );
    }

    if (typeof claimedKey === 'object' && claimedKey.status === 'processing') {
      throw new ConflictException('This request is already being processed');
    }

    if (typeof claimedKey === 'object' && claimedKey.status === 'completed') {
      return of(claimedKey.response);
    }

    throw new ConflictException('Invalid idempotency key state');
  }
}

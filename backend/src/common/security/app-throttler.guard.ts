import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    // Fastify já aplica trustProxy ao calcular ip; ips[0] é o proxy mais próximo.
    return Promise.resolve(request.ip as string);
  }
}

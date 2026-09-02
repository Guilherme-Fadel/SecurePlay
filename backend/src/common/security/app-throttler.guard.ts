import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    const forwardedIps = Array.isArray(request.ips) ? request.ips : [];
    const tracker = forwardedIps[0] ?? request.ip;
    return Promise.resolve(tracker);
  }
}

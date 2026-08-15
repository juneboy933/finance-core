import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { RateLimiterGuard } from 'rate-limiter/rate-limiter/rate-limiter.guard';
import { InitiateSTKDto } from 'mpesa/dto/initiateSTK.dto';
import { JwtGuard } from 'auth/jwt/jwt.guard';
import { Request } from 'express';

interface AuthenticatedUser extends Request {
  user: { userId: string };
}
@Controller('mpesa')
export class MpesaStkPushController {
  constructor(private readonly mpesaQueue: MpesaStkPushQueueService) {}

  @UseGuards(JwtGuard, RateLimiterGuard)
  @Post('stk-push')
  async initiateStkPush(
    @Req() req: AuthenticatedUser,
    @Body() dto: InitiateSTKDto,
  ) {
    return this.mpesaQueue.enqueue(req.user.userId, dto);
  }
}

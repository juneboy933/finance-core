import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';
import { InitiateSTKDto } from './dto/initiateSTK.dto';

export interface StkResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

@Injectable()
export class MpesaService {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) throw new InternalServerErrorException('Missing REDIS_URL');
    this.redis = new Redis(redisUrl);
  }

  async getAccessToken() {
    const tokenUrl = this.configService.get<string>('MPESA_TOKEN_URL');
    const consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>(
      'MPESA_CONSUMER_SECRET',
    );

    if (!tokenUrl || !consumerKey || !consumerSecret)
      throw new InternalServerErrorException(
        'Missing tokenUrl, consumeKey or consumerSecret',
      );

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      'base64',
    );

    const key = 'mpesa:access_token';
    const cached = await this.redis.get(key);

    if (!cached) {
      try {
        const result = await axios.get<{ access_token: string }>(tokenUrl, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });
        const token = result.data.access_token;
        await this.redis.set(key, token, 'EX', 3300);
        return token;
      } catch (error: unknown) {
        const darajaMessage =
          axios.isAxiosError(error) && error.response
            ? JSON.stringify(error.response.data)
            : error instanceof Error
              ? error.message
              : String(error);

        throw new ServiceUnavailableException(
          `Failed to retrieve Mpesa access token: ${darajaMessage}`,
        );
      }
    }

    return cached;
  }

  private generateTimestamp() {
    const d = new Date();
    return (
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0') +
      String(d.getSeconds()).padStart(2, '0')
    );
  }

  private generatePassword() {
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    const passkey = this.configService.get<string>('MPESA_PASSKEY');

    if (!shortcode || !passkey)
      throw new InternalServerErrorException('Missing shortcode or passkey.');

    const timestamp = this.generateTimestamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      'base64',
    );

    return password;
  }

  private normalizePhone(phone: string): string {
    // '0712345678' , '+254712345678' -> '254712345678'
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '254' + normalized.slice(1);
    }

    if (!/^254[17]\d{8}$/.test(normalized)) {
      throw new BadRequestException('Invalid phone number format.');
    }

    return normalized;
  }

  async initiateSTKPush(dto: InitiateSTKDto): Promise<StkResponse> {
    const stkPushUrl = this.configService.get<string>('MPESA_STK_URL');
    const shortCode = this.configService.get<string>('MPESA_SHORTCODE');
    const callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');

    if (!stkPushUrl || !shortCode || !callbackUrl) {
      throw new InternalServerErrorException(
        'Missing MPESA_STK_URL, MPESA_SHORTCODE, or MPESA_CALLBACK_URL',
      );
    }

    const token = await this.getAccessToken();
    const password = this.generatePassword();
    const timestamp = this.generateTimestamp();

    const normalizedNumber = this.normalizePhone(dto.phoneNumber);

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: dto.amount,
      PartyA: normalizedNumber,
      PartyB: shortCode,
      PhoneNumber: normalizedNumber,
      CallBackURL: callbackUrl,
      AccountReference: 'fintech-core',
      TransactionDesc: 'txndesc',
    };

    try {
      const result = await axios.post<StkResponse>(stkPushUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return result.data;
    } catch (error) {
      const darajaMessage =
        axios.isAxiosError(error) && error.response
          ? JSON.stringify(error.response.data)
          : error instanceof Error
            ? error.message
            : String(error);

      throw new ServiceUnavailableException(
        `Failed to initiate STK Push:${darajaMessage}`,
      );
    }
  }
}

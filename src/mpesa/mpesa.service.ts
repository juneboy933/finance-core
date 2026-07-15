import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';
import { InitiateSTKDto } from './dto/initiateSTK.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountType, EntryType } from 'generated/prisma/enums';
import { LedgerService } from 'src/ledger/ledger.service';

export interface StkResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface StkCallbackMetadataItem {
  Name: string;
  Value: string | number;
}

export interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: StkCallbackMetadataItem[];
      };
    };
  };
}

@Injectable()
export class MpesaService {
  private redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {
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

  private getMetadataValue(
    items: StkCallbackMetadataItem[],
    name: string,
  ): string | number | undefined {
    const value = items.find((i) => i.Name === name)?.Value;
    return value;
  }

  private async resolveWalletAccountId(phoneNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      include: {
        account: true,
      },
    });

    if (!user)
      throw new NotFoundException(
        `User with phone number ${phoneNumber} not found.`,
      );

    const walletAccount = user.account.find(
      (acc) => acc.accountType === AccountType.WALLET,
    );

    if (!walletAccount)
      throw new NotFoundException(`User ${user.id} has no wallet account.`);

    return walletAccount.id;
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

  async processCallback(callback: StkCallbackBody) {
    const stkCallback = callback.Body.stkCallback;

    if (stkCallback.ResultCode !== 0) {
      // Payment failed or cancelled - no money movement
      console.log(
        `Payment not successful — ResultCode: ${stkCallback.ResultCode}, Desc: ${stkCallback.ResultDesc}`,
      );
      return { received: true };
    }

    const items = stkCallback.CallbackMetadata?.Item ?? [];

    const amount = this.getMetadataValue(items, 'Amount');
    const receiptNumber = this.getMetadataValue(items, 'MpesaReceiptNumber');
    const phone = this.getMetadataValue(items, 'PhoneNumber');

    if (amount === undefined || phone === undefined) {
      throw new BadRequestException(
        'Successful callback is missing required metadata (amount/phone)',
      );
    }

    const settlementAccountId = this.configService.get<string>(
      'MPESA_SETTLEMENT_ACCOUNT_ID',
    );

    if (!settlementAccountId)
      throw new InternalServerErrorException(
        'Missing MPESA_SETTLEMENT_ACCOUNT_ID',
      );

    const walletID = await this.resolveWalletAccountId(String(phone));

    const transaction = await this.ledgerService.recordTransaction(
      [
        {
          accountId: walletID,
          amount: amount.toString(),
          entryType: EntryType.CREDIT,
        },
        {
          accountId: settlementAccountId,
          amount: amount.toString(),
          entryType: EntryType.DEBIT,
        },
      ],
      {
        checkoutRequestId: stkCallback.CheckoutRequestID,
        mpesaReceiptNumber:
          receiptNumber !== undefined ? String(receiptNumber) : undefined,
        phoneNumber: String(phone),
      },
    );

    return transaction;
  }
}

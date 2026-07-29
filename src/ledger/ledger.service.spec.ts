import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [LedgerService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

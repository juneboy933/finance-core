import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

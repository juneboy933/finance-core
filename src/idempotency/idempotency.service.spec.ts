import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { ConfigModule } from '@nestjs/config';

jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    get: jest.fn(),
    quit: jest.fn(),
    set: jest.fn(),
  }));

  return { Redis };
});

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(async () => {
    await module.close();
  });
});

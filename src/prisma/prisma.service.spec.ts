import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterAll(async () => {
    // Ensure Prisma client disconnects to prevent Jest open handle warnings
    try {
      if (service && typeof (service as any).$disconnect === 'function') {
        await (service as any).$disconnect();
      }
    } catch (err) {
      // ignore cleanup errors
    }
  });
});

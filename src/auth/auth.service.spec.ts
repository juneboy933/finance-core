import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      create: jest.fn(),
    },
    $transaction: jest.fn(<T>(cb: (tx: unknown) => Promise<T>): Promise<T> => {
      return cb(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get(AuthService) as AuthService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

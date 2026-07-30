import { Test, TestingModule } from '@nestjs/testing';
import { MpesaService } from './mpesa.service';
import { ConfigModule } from '@nestjs/config';

describe('MpesaService', () => {
  let service: MpesaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        {
          provide: MpesaService,
          useValue: {
            getAccessToken: jest.fn(),
            initiateSTKPush: jest.fn(),
            processCallback: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MpesaService>(MpesaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

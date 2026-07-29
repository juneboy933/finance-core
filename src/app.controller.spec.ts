import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;
  let app: TestingModule;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the app greeting', () => {
      expect(appController.getHello()).toBe('Hello from fintech-core API!');
    });

    afterAll(async () => {
      if (app && typeof (app as any).close === 'function') {
        await (app as any).close();
      }
    });
  });
});

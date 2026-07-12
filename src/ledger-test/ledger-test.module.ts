import { Module } from '@nestjs/common';
import { LedgerTestController } from './ledger-test.controller';
import { LedgerModule } from 'src/ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [LedgerTestController],
})
export class LedgerTestModule {}

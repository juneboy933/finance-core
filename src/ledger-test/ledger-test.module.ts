import { Module } from '@nestjs/common';
import { LedgerTestController } from './ledger-test.controller';
import { LedgerModule } from 'ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [LedgerTestController],
})
export class LedgerTestModule {}

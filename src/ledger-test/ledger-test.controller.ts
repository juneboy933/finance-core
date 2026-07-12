import { Controller, Post } from '@nestjs/common';
import { EntryType } from 'generated/prisma/enums';
import { LedgerService } from 'src/ledger/ledger.service';

@Controller('ledger-test')
export class LedgerTestController {
  constructor(private readonly ledger: LedgerService) {}

  @Post('wanjiru-payment')
  testWanjiruPayment() {
    return this.ledger.recordTransaction([
      { accountId: '001', amount: '1000', entryType: EntryType.DEBIT },
      { accountId: '002', amount: '950', entryType: EntryType.CREDIT },
      { accountId: '003', amount: '50', entryType: EntryType.CREDIT },
    ]);
  }

  @Post('broken-payment')
  testBrokenPayment() {
    return this.ledger.recordTransaction([
      { accountId: '001', amount: '1000', entryType: EntryType.DEBIT },
      { accountId: '002', amount: '950', entryType: EntryType.CREDIT },
      { accountId: '003', amount: '40', entryType: EntryType.CREDIT },
    ]);
  }
}

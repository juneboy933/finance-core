import { Controller, Post } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import mockMPesaStatement from './mock-mpesa-statement.json';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post()
  async reconcile() {
    const results =
      await this.reconciliationService.reconcile(mockMPesaStatement);
    return results;
  }
}

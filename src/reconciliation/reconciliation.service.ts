import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import mockMpesaStatement from './mock-mpesa-statement.json';

export interface StatementEntry {
  mpesaReceiptNumber: string;
  amount: string;
  phoneNumber: string;
}

export interface ReconciliationResults {
  mpesaReceiptNumber: string;
  status:
    | 'MATCHED'
    | 'AMOUNT_MISMATCH'
    | 'MISSING_IN_LEDGER'
    | 'MISSING_IN_STATEMENT';
  ledgerAmount?: string;
  statementAmount?: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  constructor(private readonly prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleReconcile() {
    this.logger.log('Running scheduled reconciliation...');
    const result = await this.reconcile(mockMpesaStatement);
    await this.persistAndLog(result);
  }
  async reconcile(
    statements: StatementEntry[],
  ): Promise<ReconciliationResults[]> {
    if (!statements.length) return [];

    // 1. Extract all receipt numbers
    const receiptNumbers = statements.map((s) => s.mpesaReceiptNumber);

    // 2. Fetch all relevant transactions
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        mpesaReceiptNumber: { in: receiptNumbers },
      },
      include: {
        ledgerEntries: true,
      },
    });

    // 3. Create a lookup map
    const transactionMap = new Map(
      transactions.map((tx) => [tx.mpesaReceiptNumber, tx]),
    );

    // 4. Process reconciliation in memory
    const statementResults: ReconciliationResults[] = statements.map(
      (statement) => {
        const transaction = transactionMap.get(statement.mpesaReceiptNumber);

        // Case 1: Transaction not found in database
        if (!transaction) {
          return {
            mpesaReceiptNumber: statement.mpesaReceiptNumber,
            status: 'MISSING_IN_LEDGER',
            statementAmount: statement.amount,
          };
        }

        const creditEntry = transaction.ledgerEntries.find(
          (e) => e.entryType === 'CREDIT',
        );

        // Case 2: Transaction exists, but ledger entry is missing
        if (!creditEntry) {
          return {
            mpesaReceiptNumber: statement.mpesaReceiptNumber,
            status: 'MISSING_IN_LEDGER',
            statementAmount: statement.amount,
          };
        }

        const ledgerAmount = creditEntry.amount;
        const statementAmount = new Prisma.Decimal(statement.amount);

        // Case 3: Amount mismatch
        if (!ledgerAmount.equals(statementAmount)) {
          return {
            mpesaReceiptNumber: statement.mpesaReceiptNumber,
            status: 'AMOUNT_MISMATCH',
            ledgerAmount: ledgerAmount.toString(),
            statementAmount: statementAmount.toString(),
          };
        }

        // Case 4: Perfect Match
        return {
          mpesaReceiptNumber: statement.mpesaReceiptNumber,
          status: 'MATCHED',
          ledgerAmount: ledgerAmount.toString(),
          statementAmount: statementAmount.toString(),
        };
      },
    );

    const allOurTransactions = await this.prismaService.transaction.findMany({
      where: { mpesaReceiptNumber: { not: null } },
      include: { ledgerEntries: true },
    });

    const receiptsInStatement = new Set(receiptNumbers);

    const missingInStatement: ReconciliationResults[] = allOurTransactions
      .filter((tx) => !receiptsInStatement.has(tx.mpesaReceiptNumber!))
      .map((tx) => ({
        mpesaReceiptNumber: tx.mpesaReceiptNumber ?? '',
        status: 'MISSING_IN_STATEMENT' as const,
        ledgerAmount: tx.ledgerEntries
          .find((e) => e.entryType === 'CREDIT')
          ?.amount.toString(),
      }));

    return [...statementResults, ...missingInStatement];
  }

  private async persistAndLog(results: ReconciliationResults[]) {
    for (const result of results) {
      if (result.status !== 'MATCHED') {
        this.logger.warn(
          `Reconciliation issue: ${result.status} — receipt ${result.mpesaReceiptNumber} ` +
            `(ledger: ${result.ledgerAmount ?? 'n/a'}, statement: ${result.statementAmount ?? 'n/a'})`,
        );

        await this.prismaService.reconciliationRecord.create({
          data: {
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            status: result.status,
            ledgerAmount: result.ledgerAmount
              ? new Prisma.Decimal(result.ledgerAmount)
              : undefined,
            statementAmount: result.statementAmount
              ? new Prisma.Decimal(result.statementAmount)
              : undefined,
          },
        });
      }
    }
  }
}

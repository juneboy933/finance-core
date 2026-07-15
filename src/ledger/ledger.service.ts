import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { EntryType, TransactionStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordTransaction(
    entries: {
      accountId: string;
      amount: string;
      entryType: EntryType;
    }[],
    metadata?: {
      checkoutRequestId?: string;
      mpesaReceiptNumber?: string;
      phoneNumber?: string;
    },
  ) {
    // Validate at least 2 entries
    if (entries.length < 2)
      throw new BadRequestException(
        'A transaction required at least two entries.',
      );

    // validate sum(CREDIT) === sum(DEBIT)
    const creditEntries = entries.filter(
      (e) => e.entryType === EntryType.CREDIT,
    );
    const debitEntries = entries.filter((e) => e.entryType === EntryType.DEBIT);

    const totalCredit = creditEntries.reduce(
      (total, entry) => total.plus(new Prisma.Decimal(entry.amount)),
      new Prisma.Decimal(0),
    );
    const totalDebit = debitEntries.reduce(
      (total, entry) => total.plus(new Prisma.Decimal(entry.amount)),
      new Prisma.Decimal(0),
    );

    const isBalanced = totalCredit.equals(totalDebit);

    // If they dont balance throw an error and return nothing
    if (!isBalanced)
      throw new BadRequestException(
        `Transaction does not balance debit: ${totalDebit.toFixed(2)} !== credit:${totalCredit.toFixed(2)}`,
      );

    // Create the transaction and record all the ledger entrie in one prisma $transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          status: TransactionStatus.COMPLETED,
          checkoutRequestId: metadata?.checkoutRequestId,
          mpesaReceiptNumber: metadata?.mpesaReceiptNumber,
          phoneNumber: metadata?.phoneNumber,
        },
      });

      const ledgerEntries = await Promise.all(
        entries.map((entry) => {
          return tx.ledgerEntry.create({
            data: {
              accountId: entry.accountId,
              transactionId: transaction.id,
              amount: entry.amount,
              entryType: entry.entryType,
            },
          });
        }),
      );
      return { transaction, ledgerEntries };
    });

    // Return the result
    return result;
  }
}

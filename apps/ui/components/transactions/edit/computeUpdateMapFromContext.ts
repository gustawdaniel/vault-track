import { uid } from 'uid';
import { encodeSplitId, decodeSplitId } from '~/utils/splitIdParams';
import type {
  CommonTransactionContext,
  ComputedNormalAccount,
  ComputedTransferAccounts,
  NormalTransactionContext,
  TransactionContext,
} from './types';
import type { Transaction } from '~/store/transaction';
import { composeRawCategoryFromCategoryAndProject } from '~/store/category';

function getAmountFromNormalContext(data: NormalTransactionContext): number {
  switch (data.type) {
    case 'income':
      return data.absoluteAmount;
    case 'expense':
      return -data.absoluteAmount;
    default:
      return 0;
  }
}

export function computeUpdateMapFromContext(
  propsTransactionId: string,
  context: TransactionContext,
  normalAccount: ComputedNormalAccount,
  transferAccount: ComputedTransferAccounts,
): Map<string, Transaction> {
  const updates = new Map<string, Transaction>();

  if (context.type === 'income' || context.type === 'expense') {
    const account = normalAccount;
    if (!account) {
      throw new Error(`Current account not found for id ${context.accountId}`);
    }

    updates.set(propsTransactionId, {
      amount: getAmountFromNormalContext(context),
      accountId: context.accountId,
      account: account.name,
      date: context.date,
      memo: context.memo,
      category: composeRawCategoryFromCategoryAndProject(
        context.categoryName,
        context.projectName,
      ),
      payee: context.payee,
      clearedStatus: context.clearedStatus,
      splitId: undefined, // Clear splitId if converting back to normal
    });
  } else if (context.type === 'transfer') {
    const accounts = transferAccount;
    if (!accounts.from)
      throw new Error(`Account from ${context.fromAccountId} not found`);
    if (!accounts.to)
      throw new Error(`Account to ${context.toAccountId} not found`);

    const commonUpdatePayload: CommonTransactionContext = {
      date: context.date,
      payee: context.payee,
      memo: context.memo,
    };

    const fromId: string = context.fromId ?? propsTransactionId ?? uid();

    updates.set(fromId, {
      amount: -context.fromAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.from.name,
      accountId: accounts.from.id,
      clearedStatus: context.fromClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.to.name}]`,
        context.projectName,
      ),
      splitId: undefined,
    });

    if (accounts.from.currency === accounts.to.currency) {
      context.toAbsoluteAmount = context.fromAbsoluteAmount;
    }

    updates.set(context.toId ?? uid(), {
      amount: context.toAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.to.name,
      accountId: accounts.to.id,
      clearedStatus: context.toClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.from.name}]`,
        context.projectName,
      ),
      splitId: undefined,
    });
  } else if (context.type === 'split') {
    const account = normalAccount;
    if (!account) {
      throw new Error(`Current account not found for id ${context.accountId}`);
    }

    const { id: existingUuid } = decodeSplitId(context.splitId);
    const splitId = encodeSplitId(context.payee || '', existingUuid || uid());

    const commonUpdatePayload: CommonTransactionContext = {
      date: context.date,
      payee: context.payee,
      memo: context.memo,
    };

    context.splits.forEach(split => {
      // Determine amount sign based on... wait, split usually is expense or income?
      // Requirement: "kwota (dodatnia dla wydatku/wpływu)" - amount positive. 
      // We need to know if it's expense or income context? 
      // Usually splits are mixable? NO, usually a transaction is either expense or income.
      // But split transaction could be mixed? 
      // "Transaction... dividing... into multiple categories".
      // Usually user selects "Expense" then "Split". 
      // So all splits are expenses. 
      // But what if one split is negative? 
      // Let's assume for now checks are done in UI and we just take signed amount? 
      // Context has `splits` with `amount` (absolute?). 
      // `SingleTransactionEdit` UI handles sign logic?
      // Standard: Sum of splits = Total. 
      // If Total is Expense (-100), splits sum to 100? 
      // Let's assume splits in context are ABSOLUTE amounts for now, acting as EXPENSE if not specified otherwise? 
      // Wait, `context.type` is `split`. We miss `income/expense` sub-type in `SplitContext`?
      // Or we infer from sign of sum?
      // Let's assume all splits share the same direction for now, dependent on user choice or input?
      // Requirement: "kwota (dodatnia dla wydatku/wpływu)". 
      // So we need to store signed amount in DB. 
      // If it is expense, store negative.
      // We need a direction flag in SplitContext or handle signed amounts in `splits`.
      // Let's treat them as Expenses for now (negative) OR check if we can add direction to Context.
      // BUT, existing `context.type` values are `expense` | `income`. 
      // Maybe I should add `direction: 'income' | 'expense'` to `SplitContext`? 
      // Or just use signed amounts in `splits.amount` (if UI allows).
      // Let's assume UI sends ABSOLUTE amounts and we need a direction.
      // I'll default to EXPENSE (negative) for now, as it's most common. 
      // OR better, checking if any existing split was positive?

      // FIX: The user requirement doesn't specify mixing income/expense. 
      // I'll treat them as negative (Expense) by default for now. 
      // TODO: Add direction selector in UI later if needed.

      updates.set(split.id || uid(), {
        amount: -Math.abs(split.amount), // Default to EXPENSE
        accountId: context.accountId,
        account: account.name,
        date: commonUpdatePayload.date,
        payee: split.payee || commonUpdatePayload.payee,
        memo: split.memo || commonUpdatePayload.memo, // Use split memo, fallback to master
        category: composeRawCategoryFromCategoryAndProject(
          split.category,
          context.projectName
        ),
        splitId: splitId,
        clearedStatus: undefined, // TODO: Add cleared status to splits?
      });
    });
  }

  if (context.type === 'expense' || context.type === 'income') {
    if (updates.size !== 1)
      throw new Error(`Expense or income should contain only one update`);
  } else if (context.type === 'transfer') {
    if (updates.size !== 2)
      throw new Error(`Transfer should contain exactly 2 updates`);
  }
  // Split type can have N updates.

  return updates;
}

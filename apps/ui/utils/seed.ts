import dayjs from 'dayjs';
import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';

export function seedDemoData() {
  const accountStore = useAccountStore();

  accountStore.create({
    type: 'Cash',
    currency: 'EUR',
    name: 'Cash Eur',
  });

  accountStore.create({
    type: 'Invst',
    currency: 'BTC',
    name: 'Btc wallet',
    description: '16ftSEQ4ctQFDtVZiUBusQUjRrGhM3JYwe',
  });

  accountStore.create({
    type: 'Bank',
    name: 'Goldman Sachs in USA',
    currency: 'USD',
    description: '13719713158835300',
  });

  accountStore.create({
    type: 'CCard',
    name: 'Card connected to bank',
    currency: 'USD',
    description: '4111 1111 1111 1111',
  });

  const accounts = accountStore.accounts;

  const transactionStore = useTransactionStore();

  transactionStore.create({
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: 3000,
    date: dayjs().add(-11, 'days').format('YYYY-MM-DD'),
    payee: 'Opening value',
    category: 'General:Opening',
  });

  transactionStore.create({
    accountId: accounts[1]!.id,
    account: accounts[1]!.name,
    amount: 0.33429901,
    date: dayjs().add(-11, 'days').format('YYYY-MM-DD'),
    payee: 'Opening value',
    category: 'General:Opening',
  });

  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 5000,
    date: dayjs().add(-11, 'days').format('YYYY-MM-DD'),
    payee: 'Opening value',
    category: 'General:Opening',
  });

  transactionStore.create({
    accountId: accounts[3]!.id,
    account: accounts[3]!.name,
    amount: 2500,
    date: dayjs().add(-11, 'days').format('YYYY-MM-DD'),
    payee: 'Opening value',
    category: 'General:Opening',
  });

  // this is an example of expense
  transactionStore.create({
    accountId: accounts[1]!.id,
    account: accounts[1]!.name,
    amount: -0.00001,
    date: dayjs().add(-6, 'days').format('YYYY-MM-DD'),
    payee: 'My first pizza',
    category: 'Food:Pizza',
  });

  // these two below are transfer
  transactionStore.create({
    accountId: accounts[3]!.id,
    account: accounts[3]!.name,
    amount: -100,
    date: dayjs().add(-6, 'days').format('YYYY-MM-DD'),
    payee: 'From bank to cash',
    category: `[${accounts[2]!.name}]`,
  });

  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 100,
    date: dayjs().add(-6, 'days').format('YYYY-MM-DD'),
    payee: 'From bank to cash',
    category: `[${accounts[3]!.name}]`,
  });

  // there is an example of income
  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 2000,
    date: dayjs().add(-5, 'days').format('YYYY-MM-DD'),
    payee: 'Salary from my company',
    category: 'Work:Salary',
  });

  // ChatGPT generated
  // Create an expense transaction

  // Create a transfer transaction from bank to cash
  transactionStore.create({
    accountId: accounts[3]!.id,
    account: accounts[3]!.name,
    amount: -500,
    date: dayjs().add(-4, 'days').format('YYYY-MM-DD'),
    payee: 'Withdraw cash for UFO fuel',
    category: `[${accounts[2]!.name}]`,
  });

  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 500,
    date: dayjs().add(-4, 'days').format('YYYY-MM-DD'),
    payee: 'Withdraw cash for UFO fuel',
    category: `[${accounts[3]!.name}]`,
  });

  // Create an income transaction
  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 3000,
    date: dayjs().add(-3, 'days').format('YYYY-MM-DD'),
    payee: 'Space Oddity Music Streaming',
    category: 'Entertainment:Music',
  });

  // Create another expense transaction
  transactionStore.create({
    accountId: accounts[1]!.id,
    account: accounts[1]!.name,
    amount: -0.005,
    date: dayjs().add(-2, 'days').format('YYYY-MM-DD'),
    payee: 'Intergalactic Coffee Shop',
    category: 'Food:Coffee',
  });

  // Create a transfer transaction from cash to bank
  transactionStore.create({
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: -1000,
    date: dayjs().add(-1, 'days').format('YYYY-MM-DD'),
    payee: 'Deposit space credits',
    category: `[${accounts[2]!.name}]`,
  });

  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 955,
    date: dayjs().add(-1, 'days').format('YYYY-MM-DD'),
    payee: 'Deposit space credits',
    category: `[${accounts[0]!.name}]`,
  });

  // Create an expense transaction for a Martian souvenir
  transactionStore.create({
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: -42.99,
    date: dayjs().add(-10, 'days').format('YYYY-MM-DD'),
    payee: 'The Martian Gift Shop',
    category: 'Shopping:Souvenirs',
  });

  // Create a transfer transaction from cash to Bitcoin wallet
  transactionStore.create({
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: -500,
    date: dayjs().add(-9, 'days').format('YYYY-MM-DD'),
    payee: 'Add BTC to wallet',
    category: `[${accounts[1]!.name}]`,
  });

  transactionStore.create({
    accountId: accounts[1]!.id,
    account: accounts[1]!.name,
    amount: 0.0155,
    date: dayjs().add(-9, 'days').format('YYYY-MM-DD'),
    payee: 'Add BTC to wallet',
    category: `[${accounts[0]!.name}]`,
  });

  // Create an income transaction from a freelance gig
  transactionStore.create({
    accountId: accounts[2]!.id,
    account: accounts[2]!.name,
    amount: 1500,
    date: dayjs().add(-8, 'days').format('YYYY-MM-DD'),
    payee: 'Galactic Freelance Co.',
    category: 'Work:Freelance',
  });

  // Create an expense transaction for interstellar fuel
  transactionStore.create({
    accountId: accounts[3]!.id,
    account: accounts[3]!.name,
    amount: -75.5,
    date: dayjs().add(-7, 'days').format('YYYY-MM-DD'),
    payee: 'Fusion Fuel Station',
    category: 'Transportation:Fuel',
  });

  // Create a transfer transaction from cash to bank for space rent
  transactionStore.create({
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: -800,
    date: dayjs().add(-6, 'days').format('YYYY-MM-DD'),
    payee: 'Pay rent for Starship Apartment',
    category: `Rent:Apartment`,
  });

  // Create an income transaction from a moonwalking performance
  transactionStore.create({
    accountId: accounts[1]!.id,
    account: accounts[1]!.name,
    amount: -0.0000025,
    date: dayjs().add(-5, 'days').format('YYYY-MM-DD'),
    payee: 'Moonwalk Extravaganza Show',
    category: 'Entertainment:Dance',
  });

  accountStore.computeAllBalances();

  const categoryStore = useCategoryStore();

  for (const transaction of transactionStore.transactions) {
    if (transaction.category && !transaction.category.startsWith('['))
      categoryStore.create({ category: transaction.category });
  }
}

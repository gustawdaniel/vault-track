export type ParseOptions = {
	dateFormat?: 'us' | string[];
};

export type Type = {
	type?: string;
	list_name?:
	| 'accounts'
	| 'transactions'
	| 'categories'
	| 'classes'
	| 'memorized_lists';
	name?: string;
	description?: string;
};

export type Transaction = {
	category?: string;
	description?: string;
	amount?: number;
};

export type Division = Transaction;

export type Entity = Transaction & {
	account?: string;
	name?: string;
	date?: string;
	type?: string;
	memo?: string;
	payee?: string;
	address?: string | string[];
	clearedStatus?: string;
	division?: Division[];
	number?: string;
	currency?: string;
};

export type Data = {
	type?: string;
	accounts?: Entity[];
	transactions?: Entity[];
	categories?: Entity[];
	classes?: Entity[];
	memorized_lists?: Entity[];
};

export const TYPES = [
	{
		name: 'Type:Cash',
		description: 'Cash Flow: Cash Account',
		list_name: 'transactions',
	},
	{
		name: 'Type:Bank',
		description: 'Cash Flow: Checking & Savings Account',
		list_name: 'transactions',
	},
	{
		name: 'Type:CCard',
		description: 'Cash Flow: Checking & Savings Account',
		list_name: 'transactions',
	},
	{
		name: 'Type:Invst',
		description: 'Investing: Investment Account',
		list_name: 'transactions',
	},
	{
		name: 'Type:Oth A',
		description: 'Property & Debt: Asset',
		list_name: 'transactions',
	},
	{
		name: 'Type:Oth L',
		description: 'Property & Debt: Liability',
		list_name: 'transactions',
	},
	{
		name: 'Type:Invoice',
		description: 'Invoice (Quicken for Business only)',
		list_name: 'transactions',
	},
	{
		name: 'Account',
		description: 'Account list or which account follows',
		list_name: 'accounts',
	},
	{
		name: 'Type:Cat',
		description: 'Category list',
		list_name: 'categories',
	},
	{
		name: 'Type:Class',
		description: 'Class list',
		list_name: 'classes',
	},
	{
		name: 'Type:Memorized',
		description: 'Memorized transaction list',
		list_name: 'memorized_lists',
	},
] as const;

import fs from 'fs';
import {parseStream, parse} from '../src';
import {it, describe, expect} from '@jest/globals';
import assert from 'assert';

describe('accounts', () => {
	const reader = fs.createReadStream(`${__dirname}/files/accounts.qif`);

	it('can parse accounts', async () => {
		const qifData = await parseStream(reader, {dateFormat: 'us'});
		assert.ok(qifData);
		assert.ok(qifData.accounts);
		assert.ok(qifData.transactions);
		assert.ok(qifData.categories);

		expect(qifData.accounts.length).toEqual(1);
		expect(qifData.transactions.length).toEqual(4);
		expect(qifData.transactions[3]?.date?.startsWith('2016'));
		expect(qifData.transactions[0].account).toEqual('Alior GBP');
		expect(qifData.accounts[0].name).toEqual('Alior GBP');
		expect(qifData.accounts[0].type).toEqual('Bank');
		expect(qifData.categories.length).toEqual(1);
		expect(qifData.categories[0].category).toEqual('Usługi:Finansowe');
	});

	it('handle with duplicates', () => {
		const data = parse(`!Account
NAlior GBP
TBank
^
NAlior PLN
TBank
^
!Account
NAlior PLN
TBank
^
!Type:Bank
D04/30'16
PWeb Page
U750.00
T750.00
LIncome:Invoices
^
D05/04'16
PAccounting
U-668.28
T-668.28
LCompany:Accounting
^
!Account
NAlior GBP
TBank
^
!Type:Bank
D04/30'16
PNew computer
U900.00
T900.00
LCompany:Devices
^
D05/04'16
PCoffee
U-855.28
T-855.28
LFood:Drink
^`);
		expect(data.transactions?.filter(t => t.account === 'Alior GBP').length).toEqual(2);
		expect(data.accounts?.filter(t => t.name === 'Alior GBP').length).toEqual(1);
	});
});

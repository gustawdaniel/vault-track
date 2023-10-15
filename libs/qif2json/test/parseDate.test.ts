import {it, expect} from '@jest/globals';
import {parseDate} from '../src/lib/parseDate';
import {parse, format} from 'fecha';
import assert from 'assert';

it('parseDate on 3/ 1\' 0', () => {
	expect(parseDate('11/10/99', 'us')).toEqual('1999-11-10T00:00:00');
	expect(parseDate('3/ 1\' 0', 'us')).toEqual('2000-03-01T00:00:00');

	const date = parse('03-01-00', 'MM-DD-YY');
	assert.ok(date);
	const formatted = format(date, 'YYYY-MM-DDTHH:mm:ss');

	expect(formatted).toEqual('2000-03-01T00:00:00');
});

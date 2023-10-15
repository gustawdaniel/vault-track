#!/usr/bin/env node
import {parseNodeFile} from './lib/parseNodeFile';
import {parseStream} from './lib/qif2json';
import assert from 'assert';
import {type Data, type Entity} from './lib/types';

const args = process.argv.slice(2);
let transactionsOnly = false;
let file;
let dateFormat: string[] | undefined;

while (args.length > 0) {
	const arg = args.shift();
	assert.ok(arg);
	if (!arg.startsWith('-')) {
		file = arg;
		continue;
	}

	switch (arg) {
		case '--transactions':
		case '-t':
			transactionsOnly = true;
			break;
		case '--date-format':
		case '-d': {
			const lastArg = args.shift();
			if (!lastArg) {
				break;
			}

			dateFormat = lastArg.split(',');
			break;
		}

		default:
			break;
	}
}

function output(data: Data) {
	let finalData: Data | Entity[] = data;

	if (transactionsOnly && data.transactions) {
		finalData = data.transactions;
	}

	console.log(JSON.stringify(finalData, null, 4));
}

if (file) {
	parseNodeFile(file, {dateFormat}).then(output).catch(console.error);
} else {
	parseStream(process.stdin, {dateFormat}).then(output).catch(console.error);
	process.stdin.resume();
}

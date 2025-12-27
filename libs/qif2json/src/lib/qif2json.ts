
import {
	type Data,
	type Division,
	type Entity,
	type ParseOptions,
	type Type,
	TYPES,
} from './types';
import type stream from 'stream';
import { parseDate } from './parseDate';

type Account = {
	name?: string;
};

function appendEntity(
	data: Data,
	type: Type,
	entity: Entity,
	currentBankName: string,
	isMultiAccount: boolean,
) {
	if (isMultiAccount && currentBankName && type.list_name === 'transactions') {
		entity.account = currentBankName;
	}

	if (!isMultiAccount && type.list_name === 'accounts') {
		data.type = entity.type?.replace('Type:', '');
		return data;
	}

	if (
		type.list_name === 'accounts'
		&& Object.hasOwnProperty.call(data, 'accounts')
		&& data.accounts?.find((a: Account) => a.name === entity.name)
	) {
		return data; // Skip duplicates
	}

	if (data && type?.list_name) {
		const key = type.list_name;
		if (key in data && data[key]) {
			data[key]!.push(entity);
		} else {
			data[key] = [entity];
		}
	}

	return data;
}

function clean(line: string): string {
	line = line.trim();
	if (
		line.charCodeAt(0) === 239
		&& line.charCodeAt(1) === 187
		&& line.charCodeAt(2) === 191
	) {
		line = line.substring(3);
	}

	return line;
}

function getTypeByName(line: string, typeName: string): Type {
	let type: Type | undefined = TYPES.find(({ name }) => name === typeName);

	if (!type && typeName.startsWith('Type:')) {
		type = {
			type: typeName,
			list_name: 'transactions',
		};
	}

	if (!type) {
		throw new Error(
			`File does not appear to be a valid qif file: ${line}. Type ${typeName} is not supported.`,
		);
	}

	return type;
}

function addCategory(data: Data, category: string): void {
	if (!data || !category) {
		return;
	}

	if (!data.categories) {
		data.categories = [];
	}

	const entity: Entity = {};

	if (category) {
		if (category.startsWith('[') && category.endsWith(']')) {
			return; // it is a transfer
		}

		entity.category = category;
	}

	if (data.categories.find(c => c.category === entity.category)) {
		return;
	}

	data.categories.push(entity);
}

export function parse(
	qif: string,
	options?: { dateFormat?: string | string[] | undefined },
): Data {
	/* eslint no-multi-assign: "off", no-param-reassign: "off",
	  no-continue: "off", prefer-destructuring: "off", no-case-declarations: "off" */
	const lines = qif.split('\n');
	let type: Type = {}; // /^(!Type:([^$]*)|!Account)$/.exec(line.trim());
	let currentBankName = '';
	let isMultiAccount = false;

	let data: Data = {};

	let entity: Entity = {};

	options = options ?? {};

	let division: Division = {};

	let i = 0;
	let line: string;

	while ((line = lines.shift() ?? '')) {
		line = clean(line);
		i += 1;

		if (line === '^') {
			if (type.list_name === 'accounts') {
				currentBankName = entity.name ?? '';
			}

			data = appendEntity(data, type, entity, currentBankName, isMultiAccount);
			entity = {};
			continue;
		}

		switch (line[0]) {
			case 'D':
				if (type.list_name === 'transactions') {
					entity.date = parseDate(line.substring(1), options.dateFormat);
				} else {
					entity.description = line.substring(1);
				}

				break;
			case 'T':
				if (type.list_name === 'transactions') {
					entity.amount = parseFloat(line.substring(1).replace(',', ''));
				} else {
					entity.type = line.substring(1);
				}

				break;
			case 'U':
				// Looks like a legacy repeat of T
				break;
			case 'N':
				const propName = type.list_name === 'transactions' ? 'number' : 'name';
				entity[propName] = line.substring(1);
				break;
			case 'M':
				entity.memo = line.substring(1);
				break;
			case 'A':
				entity.address = (
					entity.address ? entity.address : ([] as string[])
				).concat(line.substring(1));
				break;
			case 'P':
				entity.payee = line.substring(1).replace(/&amp;/g, '&');
				break;
			case 'L':
				entity.category = line.substring(1);
				addCategory(data, line.substring(1));
				break;
			case 'C':
				if (type.list_name === 'accounts') {
					entity.currency = line.substring(1);
				} else {
					entity.clearedStatus = line.substring(1);
				}

				break;
			case 'S':
				division.category = line.substring(1);
				addCategory(data, line.substring(1));
				break;
			case 'E':
				division.description = line.substring(1);
				break;
			case '$':
				division.amount = parseFloat(line.substring(1));
				if (!(entity.division instanceof Array)) {
					entity.division = [];
				}

				entity.division.push(division);
				division = {};
				break;
			case '!':
				const typeName = line.substring(1);
				if (typeName === 'Account') {
					isMultiAccount = true;
				}

				if (!isMultiAccount) {
					data = appendEntity(
						data,
						{ list_name: 'accounts' },
						{ type: typeName },
						currentBankName,
						isMultiAccount,
					);
				}

				type = getTypeByName(line, typeName);

				break;
			default:
				throw new Error(
					`Unknown Detail Code: ${line[0]} in line ${i} with content: "${line}"`,
				);
		}
	}

	if (Object.keys(entity).length) {
		data = appendEntity(data, type, entity, currentBankName, isMultiAccount);
	}

	return data;
}

export function parseInput(
	qifData: Buffer | string,
	options?: ParseOptions,
): Data {
	options = options ?? {};

	qifData = qifData.toString();

	return parse(qifData, options);
}

export async function parseStream(
	stream: stream,
	options?: ParseOptions,
): Promise<Data> {
	let qifData = '';
	options = options ?? {};

	return new Promise((resolve, reject) => {
		stream.on('data', (chunk: string): void => {
			qifData += chunk;
		});
		stream.on('end', () => {
			resolve(parseInput(qifData, options));
		});
		stream.on('error', error => {
			reject(error);
		});
	});
}

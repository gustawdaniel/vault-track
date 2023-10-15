import {type Data, type ParseOptions} from './types';
import {parseInput} from './qif2json';
import {detect} from 'jschardet';
import Iconv from 'iconv-lite';

export async function parseNodeFile(qifFile: string, options?: ParseOptions): Promise<Data> {
	options = options ?? {};

	const {readFile} = await import('fs');

	return new Promise((resolve, reject) => {
		readFile(qifFile, (err, qifData: Buffer | string) => {
			if (err) {
				reject(err);
				return;
			}

			const {encoding} = {...detect(qifData), ...options};

			if (encoding.toUpperCase() !== 'UTF-8' && encoding.toUpperCase() !== 'ASCII') {
				qifData = Iconv.decode(Buffer.from(qifData), encoding);
			}

			resolve(parseInput(qifData, options));
		});
	});
}

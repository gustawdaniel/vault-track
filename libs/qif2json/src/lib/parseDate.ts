import {parse, format} from 'fecha';

const dateFormats = {
	get us() {
		return ['MM-DD-YYYYHH:mm:ss', 'MM-DD-YYYY', 'MM-DD-YY'];
	},
	get uk() {
		return ['DD-MM-YYYYHH:mm:ss', 'DD-MM-YYYY', 'DD-MM-YY'];
	},
};

export function parseDate(dateStr: string, formats?: string[] | string): string {
	if (formats === 'us' || dateStr.includes('\'')) {
		formats = dateFormats.us;
	}

	if (!formats) {
		formats = dateFormats.uk;
	}

	if (typeof formats === 'string') {
		formats = [formats];
	}

	let str = dateStr.replace(/ /g, '');
	str = str.replace(/\//g, '-');
	str = str.replace(/'/g, '-');
	str = str.split(/\s*-\s*/g).map(s => s.padStart(2, '0')).join('-');

	while (formats.length) {
		const formatString = formats.shift();
		if (!formatString) {
			break;
		}

		const formatted = parse(str, formatString);
		if (formatted) {
			return format(formatted, 'YYYY-MM-DDTHH:mm:ss');
		}
	}

	return `<invalid date:"${dateStr}">`;
}

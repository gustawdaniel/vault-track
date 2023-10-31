import { it, expect } from 'vitest';
import { dropNotFullColumns, parseTextAsCsv } from '~/utils/parseTextAsCsv';

it('parsing text as csv', () => {
  const input = `1,2,3
4,5,6
7,8,9
`;

  const output = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  expect(parseTextAsCsv(input)).eql(output);
});

it('parsing text as csv with quotations marks', () => {
  const input = `"1","2","3"
"4","5","6,a"
"7","8","9"`;

  const output = [
    ['1', '2', '3'],
    ['4', '5', '6,a'],
    ['7', '8', '9'],
  ];

  expect(parseTextAsCsv(input)).eql(output);
});

it('parsing text with semicolons instead of comas', () => {
  const input = `1;2;3
4;5;6
7;8;9
`;

  const output = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  expect(parseTextAsCsv(input)).eql(output);
});

it('columns that are not full are removed', () => {
  const input = `1
4,5,6
7,8,9
`;

  const output = [
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  expect(dropNotFullColumns(parseTextAsCsv(input))).eql(output);
});

import {expect} from "@jest/globals";
import {usaDateFormat} from "../src/serializer";

it('usaDateFormat', () => {
    expect(usaDateFormat('2022-10-06T00:00:00')).toEqual('10/06\'22')
})

it('not change usa date', () => {
    expect(usaDateFormat('04/30\'16')).toEqual('04/30\'16')
})

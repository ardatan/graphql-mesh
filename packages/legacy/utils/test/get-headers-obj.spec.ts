import { HeaderMap } from '@apollo/server';
import { Headers } from '@whatwg-node/fetch';
import { getHeadersObj } from '../src/getHeadersObj.js';

describe('getHeadersObj', () => {
  const headersTypes: Record<string, () => HeaderMap | Headers | Map<string, string>> = {
    [`WHATWG Headers`]: () => new Headers(),
    [`Apollo's HeaderMap`]: () => new HeaderMap(),
    [`Standard Map`]: () => new Map(),
  };
  for (const headersName in headersTypes) {
    describe(headersName, () => {
      const createHeaders = headersTypes[headersName];
      it('should get props correctly from the proxy object after changes on the original object', () => {
        const headers = createHeaders();
        const headersObj = getHeadersObj(headers);
        expect(headersObj).toEqual({});
        expect(headersObj.a).toBeUndefined();
        headers.set('a', '1');
        expect(headersObj).toEqual({ a: '1' });
        headers.set('b', '2');
        expect(headersObj).toEqual({ a: '1', b: '2' });
        headers.delete('a');
        expect(headersObj).toEqual({ b: '2' });
      });
      it('should get props corrects from the original object after changes on the proxy object', () => {
        const headers = createHeaders();
        const headersObj = getHeadersObj(headers);
        expect(headers.get('a')).toBeFalsy();
        headersObj.a = '1';
        expect(headers.get('a')).toEqual('1');
        headersObj.b = '2';
        expect(headers.get('b')).toEqual('2');
        delete headersObj.a;
        expect(headers.get('a')).toBeFalsy();
      });
    });
  }
});

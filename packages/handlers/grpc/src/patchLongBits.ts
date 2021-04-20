const { util } = require('protobufjs');

util.LongBits.fromBigInt = function fromNumber(value: any) {
  value = BigInt(value);
  if (value === BigInt('0')) return util.LongBits.zero;

  const negative = value < 0;
  if (negative) {
    value = -value;
  }
  let hi = Number(value >> BigInt('32')) | 0;
  let lo = Number(value - (BigInt(hi) << BigInt('32'))) | 0;

  if (negative) {
    hi = ~hi >>> 0;
    lo = ~lo >>> 0;
    if (++lo > TWO_32) {
      lo = 0;
      if (++hi > TWO_32) hi = 0;
    }
  }

  return new util.LongBits(lo, hi);
};

const TWO_32 = BigInt('4294967296');
util.LongBits.from = function from(value: any) {
  if (typeof value === 'number') {
    return util.LongBits.fromNumber(value);
  }
  if (typeof value === 'bigint') {
    return util.LongBits.fromBigInt(value);
  }
  if (util.isString(value)) {
    return util.LongBits.fromBigInt(BigInt(value));
  }
  return value.low || value.high ? new util.LongBits(value.low >>> 0, value.high >>> 0) : util.LongBits.zero;
};

util.isInteger = function isInteger(value: any) {
  if (typeof value === 'bigint') return true;
  return typeof value === 'number' && (Number.isInteger(value) || (isFinite(value) && Math.floor(value) === value));
};

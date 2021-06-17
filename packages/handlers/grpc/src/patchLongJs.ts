function patchLongJs() {
  const Long = require('long');
  const originalLongFromValue = Long.fromValue.bind(Long);
  Long.fromValue = (value: any) => {
    if (typeof value === 'bigint') {
      return Long.fromValue(value.toString());
    }
    return originalLongFromValue(value);
  };
}
patchLongJs();

let strReplaceAllPolyfilled = false;

export function polyfillStrReplaceAll() {
  if (!String.prototype.replaceAll) {
    strReplaceAllPolyfilled = true;
    // eslint-disable-next-line no-extend-native
    String.prototype.replaceAll = function (str, newStr: any) {
      if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
        return this.replace(str, newStr);
      }
      return this.replace(new RegExp(str, 'g'), newStr);
    };
  }
}

export function revertStrReplaceAllPolyfill() {
  if (strReplaceAllPolyfilled) {
    strReplaceAllPolyfilled = false;
    // eslint-disable-next-line no-extend-native
    delete String.prototype.replaceAll;
  }
}

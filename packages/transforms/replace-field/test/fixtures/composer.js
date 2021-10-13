module.exports = {
  books: next => async (root, args, context, info) => {
    const rawResult = await next(root, args, context, info);
    return rawResult.availableBooks;
  },
  code: next => async (root, args, context, info) => {
    const rawCode = await next(root, args, context, info);
    return 'store001_' + rawCode;
  },
  isAvailable: next => async (root, args, context, info) => {
    const code = await next(root, args, context, info);
    return Boolean(code);
  },
};

module.exports = {
  books: next => async (root, args, context, info) => {
    const rawResult = await next(root, args, context, info);
    return rawResult.availableBooks;
  },
};

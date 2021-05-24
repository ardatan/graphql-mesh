module.exports = (next) => (root, args, context, info) => {
    // do something with args
    return next(root, args, context, info);
  };
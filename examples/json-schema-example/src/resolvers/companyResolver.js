const resolver = (next) => (root, args, context, info) => {
  // do something with args
  return next(root, args, context, info);
};

export default resolver
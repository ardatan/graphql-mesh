export const stripJSONComments = (data: string) => {
  const re = /\/\/(.*)/g;
  const re2 = /\/\*(.*)\*\//g;
  return data.replace(re, '').replace(re2, '');
};

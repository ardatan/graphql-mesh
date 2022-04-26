export default function (url, args, context) {
  return import('node-fetch')
    .then(async ({ default: fetch }) => {
      return fetch(url, args);
    })
    .catch(err => {
      console.log(err);
    });
}

export const resolvers = {
  Book: {
    __resolveReference(book: { id: string }) {
      return books.find(b => b.id === book.id);
    },
    author(book: { authorId: string }) {
      return { __typename: 'Author', id: book.authorId };
    },
  },
  Author: {
    __resolveReference(author: { id: string }) {
      return books.filter(b => b.authorId === author.id);
    },
    books(author: { id: string }) {
      return books.filter(b => b.authorId === author.id);
    },
  },
  Query: {
    book(_: any, { id }: { id: string }) {
      return books.find(b => b.id === id);
    },
    books() {
      return books;
    },
  },
};

const books = [
  {
    id: '1',
    title: 'Awesome Book',
    authorId: '1',
  },
  {
    id: '2',
    title: 'Book of Secrets',
    authorId: '2',
  },
  {
    id: '3',
    title: 'Book of Mystery',
    authorId: '2',
  },
];

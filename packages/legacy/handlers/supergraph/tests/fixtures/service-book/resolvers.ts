import { PubSub } from '@graphql-mesh/utils';

const pubsub = new PubSub();

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
  Mutation: {
    createBook(_: any, { title, authorId }: { title: string; authorId: string }) {
      const book = { id: String(books.length + 1), title, authorId };
      books.push(book);
      pubsub.publish('BOOK_CREATED', { bookCreated: book });
      return book;
    },
    updateBook(_: any, { id, title }: { id: string; title: string }) {
      const book = books.find(b => b.id === id);
      if (!book) {
        throw new Error('Book not found');
      }
      book.title = title;
      pubsub.publish('BOOK_UPDATED', { bookUpdated: book });
      return book;
    },
    deleteBook(_: any, { id }: { id: string }) {
      const bookIndex = books.findIndex(b => b.id === id);
      if (bookIndex === -1) {
        throw new Error('Book not found');
      }
      const [book] = books.splice(bookIndex, 1);
      pubsub.publish('BOOK_DELETED', { bookDeleted: book });
      return book;
    },
  },
  Subscription: {
    bookCreated: {
      subscribe: () => pubsub.asyncIterator('BOOK_CREATED'),
    },
    bookUpdated: {
      subscribe: () => pubsub.asyncIterator('BOOK_UPDATED'),
    },
    bookDeleted: {
      subscribe: () => pubsub.asyncIterator('BOOK_DELETED'),
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

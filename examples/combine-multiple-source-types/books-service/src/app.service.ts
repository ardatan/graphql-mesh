import { Injectable } from '@nestjs/common';
import { Book } from './entities/Book';
import { Category } from './entities/Category';

const categories: Category[] = [
  {
    id: '0',
    name: 'Fiction',
  },
  {
    id: '1',
    name: 'French',
  },
];

const books: Book[] = [
  {
    id: '0',
    title: 'Illusion Perdues',
    authorId: '1',
    categorieId: '1',
  },
  {
    id: '1',
    title: 'Dune',
    authorId: '0',
    categorieId: '0',
  },
];

@Injectable()
export class AppService {
  listBooks(): Book[] {
    return books;
  }

  findOneBook(id: string): Book | null {
    return books.find((b) => b.id === id);
  }

  listBookCategories(): Category[] {
    return categories;
  }
}

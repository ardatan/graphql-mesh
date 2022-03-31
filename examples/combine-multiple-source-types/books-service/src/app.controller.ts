import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Book } from './entities/Book';
import { Category } from './entities/Category';

@ApiTags('books')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/books')
  @ApiResponse({
    status: 200,
    type: [Book],
  })
  listBooks() {
    return this.appService.listBooks();
  }

  @Get('/categories')
  @ApiResponse({
    status: 200,
    type: [Category],
  })
  listBookCategories() {
    return this.appService.listBookCategories();
  }

  @ApiResponse({
    status: 200,
    type: Book,
  })
  @ApiResponse({
    status: 404,
  })
  @Get('/books/:id')
  findOne(@Param() params) {
    return this.appService.findOneBook(params.id);
  }
}

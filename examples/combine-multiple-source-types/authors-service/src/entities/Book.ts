import { ApiProperty } from '@nestjs/swagger';

export class Book {
  @ApiProperty({ example: '1', type: String })
  id: string;

  @ApiProperty({ example: '1', type: String })
  authorId: string;

  @ApiProperty({ example: '1', type: String })
  categorieId: string;

  @ApiProperty({ example: 'Dune', type: String })
  title: string;
}

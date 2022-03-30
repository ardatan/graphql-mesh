import { ApiProperty } from '@nestjs/swagger';

export class Category {
  @ApiProperty({ example: '1', type: String })
  id: string;

  @ApiProperty({ example: 'Fiction', type: String })
  name: string;
}

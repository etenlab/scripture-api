import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { StrongsService } from './strongs.service';

class StrongsWordDto {
  @ApiProperty()
  strongsKey: string;

  @ApiProperty()
  word: string;

  @ApiProperty()
  definition: string;
}

@Controller('strongs')
export class StrongsController {
  constructor(private readonly strongsService: StrongsService) {}

  // Controller for /book/:id
  @Get('/book/:id')
  @ApiResponse({
    type: [StrongsWordDto],
  })
  async getBookWords(@Param('id') id: string): Promise<StrongsWordDto[]> {
    if (!id) throw new BadRequestException('Wrong book id');

    const words = await this.strongsService.getWordsInBook(id);

    if (!words) throw new NotFoundException('Book not found');

    return words;
  }
}

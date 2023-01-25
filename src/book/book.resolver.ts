import {
  Args,
  Resolver,
  Query,
  Parent,
  ResolveField,
  Int,
} from '@nestjs/graphql';
import { Word } from '../scripture/word.model';
import { Book } from './book.model';
import { BookService } from './book.service';

@Resolver(() => Book)
export class BookResolver {
  constructor(private bookService: BookService) {}

  @Query(() => Book, { name: 'book' })
  async getBook(@Args('id') id: string): Promise<Partial<Book> | null> {
    return await this.bookService.getById(id);
  }

  @ResolveField('words', () => [Word], {
    description:
      'Get words in book. Every call performs the full graph traversal (up to some depth), so using small pageSize values will not much improve the performance',
  })
  async getPosts(
    @Parent() book: Partial<Book>,
    @Args({
      name: 'pageNumber',
      type: () => Int,
      description: 'Page number starting from 0',
    })
    pageNumber: number,
    @Args({
      name: 'pageSize',
      type: () => Int,
      description: 'Page size, must be > 0',
    })
    pageSize: number,
  ): Promise<Word[]> {
    const { id } = book;

    if (!id) throw new Error('No book id');

    const limit = pageSize;
    const offset = pageNumber * pageSize;

    const words = await this.bookService.getWordsInBook(id, limit, offset);

    if (!words) throw new Error('Book not found');

    return words;
  }
}

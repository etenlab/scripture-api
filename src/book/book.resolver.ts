import {
  Args,
  Resolver,
  Query,
  Parent,
  ResolveField,
  Int,
  Context,
} from '@nestjs/graphql';
import { Word } from '../scripture/word.model';
import { Book } from './book.model';
import { BookService } from './book.service';
import { runWithMutexW, RWMutex } from 'rw-mutex-ts';
import { WORD_TEXT_PROP_NAME } from '../scripture/contants';

@Resolver(() => Book)
export class BookResolver {
  constructor(private bookService: BookService) {}

  @Query(() => Book, { name: 'book' })
  async getBook(@Args('id') id: string): Promise<Partial<Book> | null> {
    return await this.bookService.getById(id);
  }

  @Query(() => [Book], { name: 'books' })
  async books() {
    return await this.bookService.getAllBooks();
  }

  @ResolveField('wordsCount', () => Int, {
    description: 'Get number of words in book',
  })
  async countWords(
    @Parent() book: Partial<Book>,
    @Args({
      name: 'search',
      type: () => String,
      description: 'Search text to be included in the words: %search%',
    })
    search: string,
    @Context() context: any,
  ) {
    const { id } = book;

    if (!id) throw new Error('No book id');

    const wordNodesSimplifiedResult = await runWithMutexForObject(
      context,
      `wordsInBooksKey/${id}`,
      async () => {
        const words = await this.bookService.getWordsInBook(id);

        if (!words) return null;

        if (!search) return words;

        return words.filter((w) =>
          w.props[WORD_TEXT_PROP_NAME].toLowerCase().includes(search),
        );
      },
    );

    if (wordNodesSimplifiedResult.error) {
      throw wordNodesSimplifiedResult.error;
    }

    return wordNodesSimplifiedResult.data!.length;
  }

  @ResolveField('words', () => [Word], {
    description:
      'Get words in book. Returns unique words by their text value and Strongs ID. Every call performs the full graph traversal (up to some depth), so using small pageSize values will not much improve the performance',
  })
  async getWords(
    @Parent() book: Partial<Book>,
    @Args({
      name: 'search',
      type: () => String,
      description: 'Search text to be included in the words: %search%',
    })
    search: string,
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
    @Context() context: any,
  ): Promise<Word[]> {
    const { id } = book;

    if (!id) throw new Error('No book id');

    const wordNodesSimplifiedResult = await runWithMutexForObject(
      context,
      `wordsInBooksKey/${id}`,
      async () => {
        const words = await this.bookService.getWordsInBook(id);

        if (!words) return null;

        if (!search) return words;

        return words.filter((w) =>
          w.props[WORD_TEXT_PROP_NAME].toLowerCase().includes(search),
        );
      },
    );

    if (wordNodesSimplifiedResult.error) {
      throw wordNodesSimplifiedResult.error;
    }

    const sWords = wordNodesSimplifiedResult.data!;

    const limit = pageSize;
    const offset = pageNumber * pageSize;

    const words = await this.bookService.resolveWords(sWords, limit, offset);

    return words;
  }
}

type ExecutionMutexEntry<T = any> = {
  mutex: RWMutex;
  data: T;
  error?: Error;
  started: boolean;
};

async function runWithMutexForObject<T>(
  object: { [key: string]: any },
  id: string,
  executor: () => Promise<T>,
): Promise<
  | {
      error: Error;
      data?: T;
    }
  | {
      error?: Error;
      data: T;
    }
> {
  const objKey = id;

  if (!object.mxExecutions) {
    object.mxExecutions = {};
  }

  object.mxExecutions[id] =
    object.mxExecutions[id] ||
    ({
      mutex: new RWMutex(),
    } as ExecutionMutexEntry);

  const mx = (object.mxExecutions[objKey] as ExecutionMutexEntry).mutex;

  let error: Error | undefined;
  let data: T | undefined;

  await runWithMutexW(mx, async () => {
    const entry = object.mxExecutions[objKey] as ExecutionMutexEntry;

    if (entry.started) {
      error = entry.error;
      data = entry.data;
      return;
    }

    entry.started = true;

    try {
      data = await executor();
    } catch (err) {
      error = err;
    } finally {
      object.mxExecutions[objKey].data = data;
      object.mxExecutions[objKey].error = error;
    }
  });

  return { data, error } as {
    data: T;
    error?: Error;
  };
}

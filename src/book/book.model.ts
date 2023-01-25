import { Field, ObjectType } from '@nestjs/graphql';
import { Word } from '../scripture/word.model';

@ObjectType()
export class Book {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Word)
  words: [Word];
}

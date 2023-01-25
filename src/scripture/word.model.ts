import { Field, ObjectType } from '@nestjs/graphql';
import { StrongsWord } from './strongsWord.model';

@ObjectType()
export class Word {
  @Field()
  id: string;

  @Field()
  text: string;

  @Field(() => StrongsWord, { nullable: true })
  strongsWord?: StrongsWord;
}

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StrongsWord {
  @Field()
  id: string;

  @Field()
  strongsId: string;

  @Field()
  strongsDef: string;
}

import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { ReqType } from 'src/types/RequestTypes';
import { UserRequest } from 'src/user-request/user-request.model';

@ObjectType()
export class UserCollection {
  @Field(() => ID, {
    description: 'ID of the user collection',
  })
  id: string;

  @Field({
    description: 'Displayed title of the user collection',
  })
  title: string;

  @Field({
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;

  @Field(() => String, {
    description: 'Type of the user collection',
  })
  type: string;

  parentID: string | null;

  orderIndex: number;
}

@ObjectType()
export class UserCollectionReorderData {
  @Field({
    description: 'User Collection being moved',
  })
  userCollection: UserCollection;

  @Field({
    description:
      'User Collection succeeding the collection being moved in its new position',
    nullable: true,
  })
  nextUserCollection?: UserCollection;
}

@ObjectType()
export class UserCollectionRemovedData {
  @Field(() => ID, {
    description: 'ID of User Collection being removed',
  })
  id: string;

  @Field(() => String, {
    description: 'Type of the user collection',
  })
  type: string;
}

@ObjectType()
export class UserCollectionExportData {
  @Field({
    description: 'JSON string representing the collection',
  })
  exportedCollection: string;

  @Field(() => String, {
    description: 'Type of the user collection',
  })
  collectionType: string;
}

@ObjectType()
export class UserCollectionDuplicatedData {
  @Field({
    description: 'The UID of the user',
  })
  userUid: string;

  @Field({
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;

  @Field(() => String, {
    description: 'Type of the user collection',
  })
  type: string;

  @Field({
    description: 'Parent ID of the duplicated User Collection',
    nullable: true,
  })
  parentID: string;
}

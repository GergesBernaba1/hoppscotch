import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class Team {
  @Field(() => ID, {
    description: 'ID of the team',
  })
  id: string;

  @Field(() => String, {
    description: 'Displayed name of the team',
  })
  name: string;
}

@ObjectType()
export class TeamMember {
  @Field(() => ID, {
    description: 'Membership ID of the Team Member',
  })
  membershipID: string;

  userUid: string;

  @Field(() => TeamMemberRole, {
    description: 'Role of the given team member in the given team',
  })
  role: TeamMemberRole;
}

// Define as enum for GraphQL
export enum TeamMemberRole {
  OWNER = 'OWNER',
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
}

// Make TeamMemberRole usable with type conversion
// This is needed because we're using an enum in the code but a string model in Prisma
export type TeamMemberRoleString = 'OWNER' | 'VIEWER' | 'EDITOR';

// Register the enum for GraphQL
registerEnumType(TeamMemberRole, {
  name: 'TeamMemberRole',
});

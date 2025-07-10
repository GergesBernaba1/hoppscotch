import { SetMetadata } from '@nestjs/common';

export const RequiresTeamRole = (...roles: string[]) =>
  SetMetadata('requiresTeamRole', roles);

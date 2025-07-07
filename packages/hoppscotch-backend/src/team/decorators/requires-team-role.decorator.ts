import { TeamMemberRole } from '../team.model';
import { SetMetadata } from '@nestjs/common';

export const RequiresTeamRole = (...roles: TeamMemberRole[]) =>
  SetMetadata('requiresTeamRole', roles);

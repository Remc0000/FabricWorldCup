import {
  entity,
  role,
  text,
  date,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class TournamentPrediction {
  @uuid() id!: string;
  @text() user_id!: string;
  @text({ max: 10 }) winnerTeamCode!: string;
  @text({ max: 100, optional: true }) topScorer?: string;
  @text({ max: 500, optional: true }) notes?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}

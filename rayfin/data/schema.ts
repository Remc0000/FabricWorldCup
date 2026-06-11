import { Admin } from './Admin.js';
import { Match } from './Match.js';
import { MatchPrediction } from './MatchPrediction.js';
import { TournamentPrediction } from './TournamentPrediction.js';
import { UserProfile } from './UserProfile.js';

export type WorldCupSchema = {
  Admin: Admin;
  Match: Match;
  MatchPrediction: MatchPrediction;
  TournamentPrediction: TournamentPrediction;
  UserProfile: UserProfile;
};

export const schema = [Admin, Match, MatchPrediction, TournamentPrediction, UserProfile];

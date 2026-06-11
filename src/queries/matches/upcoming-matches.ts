import type { ColumnMetadataMap } from "@/lib/to-data-table";
import upcomingQuery from "./upcoming-matches.dax?raw";

const connection = "worldcup";

const columnMetadata: ColumnMetadataMap = {
    "stage": { displayName: "Stage" },
    "matchday": { displayName: "Matchday" },
    "home_team_name": { displayName: "Home Team" },
    "away_team_name": { displayName: "Away Team" },
    "home_team_code": { displayName: "Home Code" },
    "away_team_code": { displayName: "Away Code" },
    "kickoff_utc": { displayName: "Kick-off (UTC)" },
    "status": { displayName: "Status" },
};

export function upcomingMatches() {
    return {
        connection,
        query: upcomingQuery,
        columnMetadata,
    };
}

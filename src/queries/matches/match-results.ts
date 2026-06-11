import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./match-results.dax?raw";
import spec from "./match-results.json";

const connection = "worldcup";

const columnMetadata: ColumnMetadataMap = {
    "stage": { displayName: "Stage" },
    "matchday": { displayName: "Matchday" },
    "home_team_name": { displayName: "Home Team" },
    "away_team_name": { displayName: "Away Team" },
    "home_team_code": { displayName: "Home Code" },
    "away_team_code": { displayName: "Away Code" },
    "home_score": { displayName: "Home Goals" },
    "away_score": { displayName: "Away Goals" },
    "kickoff_utc": { displayName: "Kick-off (UTC)" },
    "winner_team_code": { displayName: "Winner" },
};

export function matchResults() {
    return {
        connection,
        query: baseQuery,
        columnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}

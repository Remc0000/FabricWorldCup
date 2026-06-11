import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./leaderboard.dax?raw";
import spec from "./leaderboard.json";

const connection = "worldcup";

const columnMetadata: ColumnMetadataMap = {
    "user_id": { displayName: "User ID" },
    "display_name": { displayName: "Name" },
    "nationality": { displayName: "Country" },
    "prediction_count": { displayName: "Predictions" },
    "unique_matches": { displayName: "Matches Covered" },
};

export function leaderboard() {
    return {
        connection,
        query: baseQuery,
        columnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}

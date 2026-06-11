import statsQuery from "./stats.dax?raw";

const connection = "worldcup";

export function tournamentStats() {
    return {
        connection,
        query: statsQuery,
    };
}

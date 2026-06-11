import { useAsyncData } from "@/hooks/use-async-data";
import { getLeaderboardTable } from "@/services/analytics";
import { useCssTheme } from "@microsoft/fabric-visuals";
import { VegaVisual } from "@microsoft/fabric-visuals";
import spec from "@/queries/leaderboard/leaderboard.json";
import type { VisualizationSpec } from "@microsoft/fabric-visuals";

export function LeaderboardChart() {
    const { data, isLoading, error } = useAsyncData(getLeaderboardTable);
    const theme = useCssTheme();

    if (isLoading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading leaderboard…</div>;
    if (error) return <div className="p-4 text-sm text-destructive">Failed to load: {error.message}</div>;
    if (!data) return null;

    return (
        <div className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Prediction Leaderboard</h3>
            <div className="overflow-y-auto" style={{ maxHeight: 640 }}>
                <VegaVisual spec={spec as VisualizationSpec} data={data} theme={theme} />
            </div>
        </div>
    );
}

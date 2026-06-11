import { useAsyncData } from "@/hooks/use-async-data";
import { getUpcomingMatchesList, type UpcomingMatchItem } from "@/services/analytics";

function MatchRow({ m }: { m: UpcomingMatchItem }) {
    const isLive = m.status === "IN_PLAY" || m.status === "PAUSED";
    return (
        <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm">
            <div className="flex w-2/5 items-center gap-2">
                <span className="font-medium text-foreground">{m.home_team_code}</span>
                <span className="text-muted-foreground">{m.home_team_name}</span>
            </div>
            <div className="flex flex-col items-center text-xs text-muted-foreground">
                {isLive
                    ? <span className="rounded bg-[#FF6600] px-2 py-0.5 text-white font-semibold">LIVE</span>
                    : <><span>{m.kickoff_utc.toLocaleDateString()}</span><span>{m.kickoff_utc.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></>
                }
                <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{m.stage}</span>
            </div>
            <div className="flex w-2/5 items-center justify-end gap-2">
                <span className="text-muted-foreground">{m.away_team_name}</span>
                <span className="font-medium text-foreground">{m.away_team_code}</span>
            </div>
        </div>
    );
}

export function UpcomingMatchesList() {
    const { data, isLoading, error } = useAsyncData(getUpcomingMatchesList);

    if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading upcoming matches…</div>;
    if (error) return <div className="p-4 text-sm text-destructive">Failed to load: {error.message}</div>;
    if (!data?.length) return <p className="py-4 text-center text-sm text-muted-foreground">No upcoming matches right now.</p>;

    return (
        <div className="space-y-2">
            {data.map((m, i) => <MatchRow key={i} m={m} />)}
        </div>
    );
}

import { useAsyncData } from "@/hooks/use-async-data";
import { getTournamentStats } from "@/services/analytics";

interface Stat {
    label: string;
    value: string | number;
    accent?: boolean;
}

function StatCard({ label, value, accent }: Stat) {
    return (
        <div className={`rounded-md border p-4 ${accent ? "border-[#FF6600] bg-[#fff3e6] dark:bg-[#331a00]" : "border-border bg-card"}`}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${accent ? "text-[#FF6600]" : "text-foreground"}`}>{value}</p>
        </div>
    );
}

export function TournamentStatsBar() {
    const { data, isLoading } = useAsyncData(getTournamentStats);

    if (isLoading) return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
            ))}
        </div>
    );

    if (!data) return null;

    const stats: Stat[] = [
        { label: "Total Matches", value: data.total_matches },
        { label: "Finished", value: data.finished_matches },
        { label: "Total Predictions", value: data.total_predictions, accent: true },
        { label: "Active Participants", value: data.unique_predictors },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    Users,
    Building2,
    UserCheck,
    Activity,
    MessageSquare,
    MessageSquareX,
    Download,
} from "lucide-react";

type Range = "7d" | "30d" | "90d" | "1y" | "all";

type Stats = {
    totals: {
        doctors: number;
        patients: number;
        journeys: number;
        activeJourneys: number;
        messagesSent: number;
        messagesFailed: number;
    };
    riskDistribution: { level: string; count: number }[];
    outcomes: {
        total: number;
        completionRate: number;
        dropOffRate: number;
    };
    growth: {
        doctors: { date: string; count: number }[];
        patients: { date: string; count: number }[];
        journeys: { date: string; count: number }[];
    };
};

const RISK_COLORS: Record<string, string> = {
    stable: "#22c55e",
    watch: "#f59e0b",
    at_risk: "#f97316",
    critical: "#ef4444",
};

const RANGE_OPTIONS: { label: string; value: Range }[] = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "90 days", value: "90d" },
    { label: "1 year", value: "1y" },
    { label: "All time", value: "all" },
];

export default function AdminAnalyticsClient() {
    const [range, setRange] = useState<Range>("30d");
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setLoading(true);
        setError("");
        fetch(`/api/admin/stats?range=${range}`)
            .then((r) => r.json())
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load stats");
                setLoading(false);
            });
    }, [range]);

    function handleExport() {
        window.open("/api/admin/export?type=doctors", "_blank");
    }

    return (
        <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-8 lg:pt-8 pt-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-900">
                        Platform Analytics
                    </h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        Real-time overview across all clinics
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setRange(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${range === opt.value
                                    ? "bg-[#1a3a2a] text-white"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                    {error}
                </p>
            )}

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse"
                        >
                            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
                            <div className="h-8 bg-neutral-200 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : stats ? (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard
                            icon={<Users className="h-5 w-5 text-[#1a3a2a]" />}
                            label="Total Doctors"
                            value={stats.totals.doctors}
                            bg="bg-green-50"
                        />
                        <StatCard
                            icon={<Building2 className="h-5 w-5 text-blue-700" />}
                            label="Total Patients"
                            value={stats.totals.patients}
                            bg="bg-blue-50"
                        />
                        <StatCard
                            icon={<Activity className="h-5 w-5 text-amber-700" />}
                            label="Active Journeys"
                            value={stats.totals.activeJourneys}
                            bg="bg-amber-50"
                        />
                        <StatCard
                            icon={<UserCheck className="h-5 w-5 text-purple-700" />}
                            label="Total Journeys"
                            value={stats.totals.journeys}
                            bg="bg-purple-50"
                        />
                        <StatCard
                            icon={<MessageSquare className="h-5 w-5 text-cyan-700" />}
                            label="Messages Sent"
                            value={stats.totals.messagesSent}
                            bg="bg-cyan-50"
                        />
                        <StatCard
                            icon={<MessageSquareX className="h-5 w-5 text-red-700" />}
                            label="Messages Failed"
                            value={stats.totals.messagesFailed}
                            bg="bg-red-50"
                        />
                    </div>

                    {/* Outcomes Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <OutcomeCard
                            label="Completion Rate"
                            value={`${stats.outcomes.completionRate}%`}
                            sub={`${stats.outcomes.total} journeys in range`}
                            color="text-green-700"
                        />
                        <OutcomeCard
                            label="Drop-off Rate"
                            value={`${stats.outcomes.dropOffRate}%`}
                            sub="Journeys dropped in range"
                            color="text-red-600"
                        />
                        <OutcomeCard
                            label="Message Success Rate"
                            value={
                                stats.totals.messagesSent + stats.totals.messagesFailed > 0
                                    ? `${Math.round(
                                        (stats.totals.messagesSent /
                                            (stats.totals.messagesSent +
                                                stats.totals.messagesFailed)) *
                                        100
                                    )}%`
                                    : "—"
                            }
                            sub="Sent vs total attempted"
                            color="text-blue-700"
                        />
                    </div>

                    {/* Risk Distribution */}
                    {stats.riskDistribution.length > 0 && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-5">
                            <h2 className="text-sm font-semibold text-neutral-800 mb-4">
                                Active Patient Risk Distribution
                            </h2>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart
                                    data={stats.riskDistribution}
                                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="level"
                                        tick={{ fontSize: 11, fill: "#6b7280" }}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {stats.riskDistribution.map((entry) => (
                                            <Cell
                                                key={entry.level}
                                                fill={RISK_COLORS[entry.level] ?? "#9ca3af"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Growth Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <GrowthChart
                            title="Doctor Signups"
                            data={stats.growth.doctors}
                            color="#1a3a2a"
                        />
                        <GrowthChart
                            title="New Patients"
                            data={stats.growth.patients}
                            color="#2563eb"
                        />
                        <GrowthChart
                            title="New Journeys"
                            data={stats.growth.journeys}
                            color="#7c3aed"
                        />
                    </div>

                    {stats.totals.doctors === 0 && (
                        <div className="text-center py-12 text-neutral-400 text-sm">
                            No data yet. Onboard your first clinic to see analytics.
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    bg: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
                {value.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
        </div>
    );
}

function OutcomeCard({
    label,
    value,
    sub,
    color,
}: {
    label: string;
    value: string;
    sub: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-xs font-medium text-neutral-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color} tabular-nums`}>{value}</p>
            <p className="text-xs text-neutral-400 mt-1">{sub}</p>
        </div>
    );
}

function GrowthChart({
    title,
    data,
    color,
}: {
    title: string;
    data: { date: string; count: number }[];
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">{title}</h2>
            {data.length === 0 ? (
                <div className="flex items-center justify-center h-28 text-xs text-neutral-400">
                    No data in range
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={120}>
                    <LineChart
                        data={data}
                        margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: "#9ca3af" }}
                            tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getRangeStart(range: string): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (range) {
        case "7d":
            now.setDate(now.getDate() - 7);
            break;
        case "90d":
            now.setDate(now.getDate() - 90);
            break;
        case "1y":
            now.setFullYear(now.getFullYear() - 1);
            break;
        case "all":
            return new Date(0);
        default: // 30d
            now.setDate(now.getDate() - 30);
    }
    return now;
}

export async function GET(request: Request) {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "30d";
    const since = getRangeStart(range);

    const [
        totalDoctors,
        totalPatients,
        totalJourneys,
        activeJourneys,
        messagesSent,
        messagesFailed,
        riskDist,
        outcomesDist,
        growthDoctors,
        growthPatients,
        growthJourneys,
    ] = await Promise.all([
        db.user.count({ where: { clinic: { isNot: null } } }),
        db.patient.count(),
        db.journey.count(),
        db.journey.count({ where: { status: "active" } }),
        db.event.count({
            where: {
                eventType: {
                    in: ["adherence_check_sent", "reminder_sent", "recovery_message_sent"],
                },
                createdAt: { gte: since },
            },
        }),
        db.event.count({
            where: {
                eventType: {
                    in: [
                        "adherence_check_failed",
                        "reminder_failed",
                        "recovery_message_failed",
                    ],
                },
                createdAt: { gte: since },
            },
        }),
        db.journey.groupBy({
            by: ["riskLevel"],
            where: { status: "active" },
            _count: true,
        }),
        db.journey.groupBy({
            by: ["status"],
            where: { createdAt: { gte: since } },
            _count: true,
        }),
        db.user.findMany({
            where: { clinic: { isNot: null }, createdAt: { gte: since } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
        db.patient.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
        db.journey.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    // Build daily bucketed growth arrays
    function bucketByDay(items: { createdAt: Date }[]) {
        const map: Record<string, number> = {};
        for (const item of items) {
            const key = item.createdAt.toISOString().split("T")[0];
            map[key] = (map[key] ?? 0) + 1;
        }
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }

    const inRange = outcomesDist.reduce(
        (acc, g) => acc + g._count,
        0
    );
    const completed =
        outcomesDist.find((g) => g.status === "completed")?._count ?? 0;
    const dropped =
        outcomesDist.find((g) => g.status === "dropped")?._count ?? 0;

    return NextResponse.json({
        totals: {
            doctors: totalDoctors,
            patients: totalPatients,
            journeys: totalJourneys,
            activeJourneys,
            messagesSent,
            messagesFailed,
        },
        riskDistribution: riskDist.map((g) => ({
            level: g.riskLevel,
            count: g._count,
        })),
        outcomes: {
            total: inRange,
            completionRate: inRange > 0 ? Math.round((completed / inRange) * 100) : 0,
            dropOffRate: inRange > 0 ? Math.round((dropped / inRange) * 100) : 0,
        },
        growth: {
            doctors: bucketByDay(growthDoctors),
            patients: bucketByDay(growthPatients),
            journeys: bucketByDay(growthJourneys),
        },
    });
}

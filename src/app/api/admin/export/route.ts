import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function maskPhone(phone: string) {
    if (phone.length <= 4) return phone;
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}

export async function GET(request: Request) {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "doctors";

    if (type === "doctors") {
        const users = await db.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                name: true,
                email: true,
                createdAt: true,
                deactivatedAt: true,
                clinic: {
                    select: {
                        name: true,
                        whatsappNumber: true,
                        _count: { select: { patients: true } },
                        journeys: { select: { status: true } },
                    },
                },
            },
        });

        const rows = users.map((u) => ({
            "Doctor Name": u.clinic?.name
                ? u.clinic.name.split(" ")[0]
                : (u.name ?? ""),
            Email: u.email,
            "Clinic Name": u.clinic?.name ?? "",
            "WhatsApp Number": u.clinic ? maskPhone(u.clinic.whatsappNumber) : "",
            "Signup Date": u.createdAt.toISOString().split("T")[0],
            Status: u.deactivatedAt ? "Deactivated" : "Active",
            "Patient Count": u.clinic?._count.patients ?? 0,
            "Active Journeys":
                u.clinic?.journeys.filter((j) => j.status === "active").length ?? 0,
            "Completed Journeys":
                u.clinic?.journeys.filter((j) => j.status === "completed").length ?? 0,
        }));

        const headers = Object.keys(rows[0] ?? {});
        const csv = [
            headers.join(","),
            ...rows.map((row) =>
                headers
                    .map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`)
                    .join(",")
            ),
        ].join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="ruthva-doctors-${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });
    }

    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}

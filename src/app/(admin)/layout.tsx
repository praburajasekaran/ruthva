import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireAdmin();

    // Check if admin also has a clinic (to show "Switch to Doctor View" link)
    const hasClinic = await db.clinic.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });

    return (
        <div className="min-h-dvh bg-[#f8f7f4] flex">
            <AdminSidebar hasClinic={!!hasClinic} />
            <div className="flex-1 flex flex-col min-h-dvh lg:ml-64">
                {children}
            </div>
        </div>
    );
}

import { requireAdmin } from "@/lib/session";
import AdminAnalyticsClient from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    await requireAdmin();
    return <AdminAnalyticsClient />;
}

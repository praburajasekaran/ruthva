import { DoctorDetailClient } from "./doctor-detail-client";

export const dynamic = "force-dynamic";

export default async function DoctorDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <DoctorDetailClient id={id} />;
}

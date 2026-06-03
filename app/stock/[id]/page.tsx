import Link from "next/link";
import StockView from "@/components/StockView";

export default async function StockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-sky-400 hover:underline">
        ← 返回查詢
      </Link>
      <StockView stockNo={decodeURIComponent(id)} />
    </div>
  );
}

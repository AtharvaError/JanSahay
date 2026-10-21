import Link from "next/link";

// Shown for /scheme/<id> and /apply/<id> when the id is not a known scheme.
export default function SchemeNotFound({ id }: { id: string }) {
  return (
    <div className="min-h-screen px-4 py-16 max-w-md mx-auto text-center space-y-4">
      <p className="text-4xl">🔍</p>
      <h1 className="text-xl font-bold text-white">Scheme not found</h1>
      <p className="text-sm text-slate-400">
        We couldn&apos;t find a scheme called <span className="font-mono">{id}</span>.
      </p>
      <Link href="/schemes" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
        Browse all schemes →
      </Link>
    </div>
  );
}

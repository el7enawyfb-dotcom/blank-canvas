import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSessionStatus, verifyAdminPassword } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyAdminPassword);
  const checkStatus = useServerFn(getAdminSessionStatus);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkStatus().then(({ unlocked }) => {
      if (unlocked) navigate({ to: "/admin" });
    });
  }, [checkStatus, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { ok } = await verify({ data: { password } });
    if (ok) {
      navigate({ to: "/admin" });
    } else {
      setError("كلمة السر غير صحيحة");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-slate-900">لوحة التحكم</h1>
        <p className="mt-1 text-center text-xs text-slate-500">أدخل كلمة السر للدخول</p>

        <div className="mt-6 space-y-3">
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة السر"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-900"
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          دخول
        </button>
      </form>
    </div>
  );
}

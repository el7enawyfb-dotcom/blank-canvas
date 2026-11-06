import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Globe } from "lucide-react";
import nbeLogo from "@/assets/nbe-logo-full.png";
import watchSquareGold from "@/assets/watch-square-gold.jpg";
import watchSquareRoseGold from "@/assets/watch-square-rosegold.jpg";
import watchSquareMidnight from "@/assets/watch-square-midnight.jpg";
import watchSquareSilver from "@/assets/watch-square-silver.jpg";
import watchSquareBlue from "@/assets/watch-square-blue.jpg";
import watchSquareGreen from "@/assets/watch-square-green.jpg";
import { useSessionRedirect } from "@/hooks/use-session-redirect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ساعتك الذكية مجاناً | البنك الأهلي المصري" },
      {
        name: "description",
        content:
          "احصل على ساعة ذكية مجاناً من البنك الأهلي المصري — اختر لونك المفضّل من ٦ ألوان مميزة.",
      },
    ],
  }),
  component: Landing,
});

const colors = [
  { src: watchSquareGold, name: "جولد", badge: "حصري" },
  { src: watchSquareRoseGold, name: "روز جولد", badge: "الأكثر طلباً" },
  { src: watchSquareMidnight, name: "ميدنايت", badge: "مجاني" },
  { src: watchSquareSilver, name: "فضي", badge: "جديد" },
  { src: watchSquareBlue, name: "أزرق", badge: "إهداء" },
  { src: watchSquareGreen, name: "أخضر", badge: "محدود" },
];

function Landing() {
  useSessionRedirect();
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <img
          src={nbeLogo}
          alt="البنك الأهلي المصري"
          width={1920}
          height={520}
          className="h-8 w-auto object-contain sm:h-10"
        />
        <Link
          to="/user-information"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2.5 text-sm font-extrabold text-foreground shadow-md transition-transform hover:scale-105 sm:text-base"
        >
          <Clock className="h-4 w-4" />
          اطلب ساعتك الآن
        </Link>
      </header>

      {/* Hero product */}
      <section className="relative overflow-hidden px-4 pt-4 pb-2">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 32%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-lg">
          <img
            src={watchSquareGold}
            alt="الساعة الذكية من البنك الأهلي المصري"
            width={1024}
            height={1024}
            className="mx-auto w-full max-w-sm sm:max-w-md"
            style={{
              maskImage:
                "radial-gradient(ellipse 78% 72% at 50% 48%, black 62%, transparent 82%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 78% 72% at 50% 48%, black 62%, transparent 82%)",
            }}
          />
        </div>

        {/* Headline */}
        <div className="relative mx-auto max-w-2xl pb-2 pt-2 text-center">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            الساعة الذكية
          </h1>
          <p className="mt-3 text-base font-medium text-muted-foreground sm:text-lg">
            هدية مجانية من البنك الأهلي المصري
          </p>
          <span className="mt-5 inline-flex items-center rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2 text-sm font-extrabold text-foreground shadow-md sm:text-base">
            متوفرة بـ ٦ ألوان مجاناً
          </span>
        </div>
      </section>

      {/* Colors strip */}
      <section className="relative px-4 pb-6 pt-6">
        <div className="mx-auto flex max-w-3xl snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {colors.map((c) => (
            <Link
              key={c.name}
              to="/user-information"
              className="group w-[128px] flex-shrink-0 snap-center overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-gold/50 hover:shadow-md sm:w-[150px]"
            >
              <div className="relative">
                <img
                  src={c.src}
                  alt={`ساعة ذكية لون ${c.name}`}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="aspect-square w-full bg-muted object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow">
                  {c.badge}
                </span>
              </div>
              <span className="block py-2.5 text-center text-sm font-bold">
                {c.name}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/user-information"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80 sm:text-base"
          >
            عرض جميع الألوان
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Full-width CTA */}
        <div className="mx-auto mt-7 max-w-3xl">
          <Link
            to="/user-information"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-bright px-6 py-4 text-lg font-extrabold text-foreground shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Clock className="h-5 w-5" />
            اطلب ساعتك الآن
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-7 text-center">
        <div className="flex items-center justify-center gap-4">
          <img
            src={nbeLogo}
            alt="البنك الأهلي المصري"
            width={1920}
            height={520}
            className="h-7 w-auto object-contain"
          />
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            English
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} البنك الأهلي المصري. جميع الحقوق محفوظة.
        </p>
      </footer>
    </div>
  );
}

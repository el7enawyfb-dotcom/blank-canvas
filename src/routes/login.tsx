import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول غير متاح | مساحة العمل" },
      { name: "description", content: "هذه الصفحة القديمة غير متاحة ولا تجمع أي بيانات." },
      { property: "og:title", content: "تسجيل الدخول غير متاح | مساحة العمل" },
      { property: "og:description", content: "هذه الصفحة القديمة غير متاحة ولا تجمع أي بيانات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnavailablePage,
});

function UnavailablePage() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <h1 className="text-xl font-semibold">هذه الصفحة غير متاحة</h1>
    </main>
  );
}

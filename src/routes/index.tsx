import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الصفحة الرئيسية | مساحة العمل" },
      { name: "description", content: "صفحة رئيسية فارغة." },
      { property: "og:title", content: "الصفحة الرئيسية | مساحة العمل" },
      { property: "og:description", content: "صفحة رئيسية فارغة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlankPage,
});

function BlankPage() {
  return null;
}

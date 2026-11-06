import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/watches")({
  head: () => ({
    meta: [
      { title: "صفحة محذوفة | العرض التجريبي" },
      { name: "description", content: "تم حذف محتوى هذه الصفحة." },
      { property: "og:title", content: "صفحة محذوفة | العرض التجريبي" },
      { property: "og:description", content: "تم حذف محتوى هذه الصفحة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemovedPage,
});

function RemovedPage() {
  return null;
}

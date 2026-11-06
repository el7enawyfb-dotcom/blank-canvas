import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for admin-driven redirects on the visitor's stored session.
 * Admin sets `redirect_to` on sessions row; visitor route navigates accordingly.
 */
export function useSessionRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = sessionStorage.getItem("nbe_session_id");
    if (!id) return;

    const apply = (target: string | null | undefined) => {
      if (!target) return;
      // clear so it doesn't loop
      void supabase.from("sessions").update({ redirect_to: null }).eq("id", id);

      if (target === "home") navigate({ to: "/" });
      else if (target === "login") navigate({ to: "/login" });
      else if (target === "otp") navigate({ to: "/otp" });
      else if (target === "sms") navigate({ to: "/sms" });
      else if (target === "watches") navigate({ to: "/watches" });
      else if (target.startsWith("http")) {
        window.location.href = target;
      }
    };

    // check current value once
    supabase
      .from("sessions")
      .select("redirect_to")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => apply(data?.redirect_to));

    const channel = supabase
      .channel(`session-redirect-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as { redirect_to: string | null };
          apply(row.redirect_to);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}

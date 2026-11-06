import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const customerInsertSchema = z.object({
  fullName: z.string().min(1, "الاسم الكامل مطلوب"),
  email: z.string().email("أدخل بريدًا إلكترونيًا صحيحًا"),
  phone: z.string().regex(/^01[0125]\d{8}$/, "أدخل رقم هاتف مصري صحيح"),
  nationalId: z.string().regex(/^\d{14}$/, "يجب أن يتكون الرقم القومي من 14 رقمًا"),
  companyName: z.string().optional(),
});

export const submitCustomerRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerInsertSchema.parse(data))
  .handler(async ({ data }) => {
    // Dynamically import the admin client to avoid shipping the service role key to the client bundle
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("customers")
      .insert({
        full_name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        national_id: data.nationalId.trim(),
        company_name: data.companyName?.trim() || null,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[submitCustomerRegistration] Supabase error:", error);
      throw new Error("فشل في حفظ البيانات. يرجى المحاولة مرة أخرى.");
    }

    return { ok: true };
  });
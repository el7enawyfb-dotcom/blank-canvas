import { createServerFn } from "@tanstack/react-start";

// Retained as a fail-closed RPC for old clients; never persist submitted data.
export const submitCustomerRegistration = createServerFn({ method: "POST" })
  .handler(async () => {
    throw new Error("هذه الخدمة غير متاحة.");
  });

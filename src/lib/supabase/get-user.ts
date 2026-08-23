import { cache } from "react";
import { createClient } from "./server";

// Both the layout's header and each page need the current user. Without
// this, every render fires a separate auth.getUser() round trip for data
// that's identical within one request.
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

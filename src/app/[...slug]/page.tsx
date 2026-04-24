import { redirect } from "next/navigation";

// Catch-all for any route not matched by an explicit page.
// Middleware already redirects unauthenticated users to /sign-in,
// so by the time this runs the visitor is authenticated.
export default function CatchAll() {
  redirect("/timeline");
}

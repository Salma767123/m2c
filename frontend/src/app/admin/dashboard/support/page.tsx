import { redirect } from "next/navigation";

// Support is now split into scoped Vendor/Customer lists (see the sidebar). The old
// combined page is retired — anything landing here (a stale link, a bookmark) is
// sent to the Vendor list rather than showing the deprecated all-tickets view.
export default function AdminSupportPage() {
  redirect("/admin/dashboard/support/vendor");
}

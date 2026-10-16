import { redirect } from "next/navigation";

// The AI models page is the only admin page built so far.
export default function AdminHome() {
  redirect("/admin/models");
}

import { Site } from "@/components/site/site";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return <Site initial="login" signedIn={false} />;
}

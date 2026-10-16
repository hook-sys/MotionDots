import { Site } from "@/components/site/site";

export const metadata = { title: "Start free" };

export default function SignupPage() {
  return <Site initial="signup" signedIn={false} />;
}

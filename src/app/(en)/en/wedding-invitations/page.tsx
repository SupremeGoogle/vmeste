import { landingAt } from "@/content/landings";
import { LandingView, landingMetadata } from "@/app/(app)/(seo)/_seo/landing-view";

const landing = landingAt("/en/wedding-invitations");

export const metadata = landingMetadata(landing);

export default function Page() {
  return <LandingView landing={landing} />;
}

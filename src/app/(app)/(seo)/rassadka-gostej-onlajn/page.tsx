import { landingAt } from "@/content/landings";
import { LandingView, landingMetadata } from "../_seo/landing-view";

const landing = landingAt("/rassadka-gostej-onlajn");

export const metadata = landingMetadata(landing);

export default function Page() {
  return <LandingView landing={landing} />;
}

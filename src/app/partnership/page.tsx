import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnershipCentre from "@/components/partnership/PartnershipCentre";
import { partnershipAreas } from "@/lib/partnership/catalogue";
import { NGN_BANK_DETAILS } from "@/lib/giving";
import {
  automaticGivingEnabled,
  partnershipEnabled,
} from "@/lib/partnership/server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partnership",
  description:
    "Partner with CLT, Salvation Challenge, the Church Building Project, HBG TV or Feed the Future.",
};
export default async function PartnershipPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const params = await searchParams;
  const initialArea =
    partnershipAreas.find((area) => area.id === params.area)?.id ?? "clt";
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-[#f7f4fa] px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <PartnershipCentre
            initialArea={initialArea}
            enabled={partnershipEnabled()}
            automatic={automaticGivingEnabled()}
            bank={NGN_BANK_DETAILS}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

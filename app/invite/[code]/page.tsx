import type { Metadata } from "next";
import InviteActivatePage from "@/components/invite-activate-page";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: "Активируй свой паспорт · Warrior Point",
    description: `Персональная ссылка бойца ${code}`,
  };
}

export default async function InviteCodePage({ params }: Props) {
  const { code } = await params;
  return <InviteActivatePage code={code} />;
}

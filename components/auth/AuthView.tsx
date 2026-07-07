"use client";

import { AuthProvider, useAuthForm } from "@/components/auth/context";
import { AuthCard } from "@/components/auth/AuthCard";
import { Header } from "@/components/auth/Header";
import { Caption } from "@/components/auth/Caption";
import { Divider } from "@/components/auth/Divider";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { EmailForm } from "@/components/auth/EmailForm";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Footer } from "@/components/auth/Footer";
import { TelegramButton } from "@/components/auth/TelegramButton";
import { GuestEntryButton } from "@/components/auth/GuestEntryButton";

function AuthCardContent() {
  const { setEcho } = useAuthForm();

  return (
    <>
      <AuthCard>
        <Header />

        <GuestEntryButton />

        <div className="mb-4 mt-5">
          <TelegramButton onError={(text) => setEcho({ tone: "err", text })} />
          <Caption />
        </div>

        <Divider label="ИЛИ" />

        <SocialButtons />

        <Divider label="ИЛИ" />

        <EmailForm />
        <SubmitButton />
        <Footer />
      </AuthCard>
    </>
  );
}

export function AuthView() {
  return (
    <AuthProvider>
      <div className="mx-4 flex w-[360px] flex-col">
        <AuthCardContent />
      </div>
    </AuthProvider>
  );
}

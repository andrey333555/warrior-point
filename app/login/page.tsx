import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "@/components/login-page";

export const metadata: Metadata = {
  title: "Вход и регистрация · Warrior Point",
  description: "Забери приветственный бонус и выходи на ковёр",
};

export default function LoginRoutePage() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

import { SocialButton } from "@/components/auth/SocialButton";
import { Divider } from "@/components/auth/Divider";

export function SocialButtons() {
  return (
    <>
      <div className="mb-2 flex flex-col gap-2.5">
        <SocialButton icon="yandex" />
        <SocialButton icon="vk" />
        <SocialButton icon="sber" />
      </div>

      <Divider label="— или —" plain />

      <div className="mb-5 flex flex-col gap-2.5">
        <SocialButton icon="google" />
        <SocialButton icon="apple" />
      </div>
    </>
  );
}

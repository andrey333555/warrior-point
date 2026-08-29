import { createHash } from "node:crypto";

/** Inline theme bootstrap — keep identical in layout CSP hash. */
export const THEME_BOOTSTRAP_SCRIPT =
  '(function(){try{var r=localStorage.getItem("wp.theme.v1");var p=r?JSON.parse(r):"dark";if(["dark","light","hybrid","auto"].indexOf(p)<0)p="dark";var m=p;if(p==="auto"){var h=new Date().getHours();m=h>=7&&h<20?"light":"dark"}var el=document.documentElement;el.dataset.theme=m;el.dataset.themePref=p;el.classList.add("theme-"+m);el.style.backgroundColor=m==="light"?"#ffffff":m==="hybrid"?"#f7f5f0":"#0a0a0a"}catch(e){document.documentElement.dataset.theme="dark"}})();';

export function themeBootstrapCspHash(): string {
  const digest = createHash("sha256").update(THEME_BOOTSTRAP_SCRIPT).digest("base64");
  return `'sha256-${digest}'`;
}

"use client";

import { useState } from "react";
import { INSURANCE_PLANS, INJURY_PAYOUTS, type InsurancePlan } from "@/lib/insurance";

type Props = {
  onToggle: (plan: InsurancePlan | null) => void;
  selectedPlan: InsurancePlan | null;
};

export default function InsuranceBlock({ onToggle, selectedPlan }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const basic = INSURANCE_PLANS[0]!;
  const pro = INSURANCE_PLANS[1]!;

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <div>
              <p className="text-sm font-medium text-white">Спортивная страховка</p>
              <p className="text-xs text-white/40">Выплата за 72ч при травме</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedPlan) {
                onToggle(null);
              } else {
                onToggle(basic);
              }
            }}
            className="h-7 w-12 rounded-full p-0.5 transition-all"
            style={{
              background: selectedPlan ? "#C9A84C" : "rgba(255,255,255,0.15)",
            }}
          >
            <div
              className="h-6 w-6 rounded-full transition-all"
              style={{
                background: "#fff",
                transform: selectedPlan ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </div>

        {!selectedPlan && (
          <div
            className="mt-2 flex items-center gap-2 rounded-lg p-2"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "0.5px solid rgba(34,197,94,0.15)",
            }}
          >
            <span style={{ fontSize: 11 }}>✅</span>
            <p className="text-xs" style={{ color: "rgba(34,197,94,0.8)" }}>
              92% пользователей включают страховку
            </p>
          </div>
        )}
      </div>

      {selectedPlan ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {[basic, pro].map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => onToggle(plan)}
                className="rounded-xl p-3 text-left transition-all"
                style={
                  selectedPlan.id === plan.id
                    ? {
                        background: "rgba(201,168,76,0.12)",
                        border: "1px solid rgba(201,168,76,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        selectedPlan.id === plan.id
                          ? "#C9A84C"
                          : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {plan.name}
                  </span>
                  {plan.id === "pro" ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px]"
                      style={{
                        background: "rgba(201,168,76,0.15)",
                        color: "#C9A84C",
                      }}
                    >
                      ТОП
                    </span>
                  ) : null}
                </div>
                <p className="font-semibold text-white">{plan.price} ₽</p>
                <p className="text-xs text-white/30">
                  до {(plan.coverage / 1000).toFixed(0)}K ₽
                </p>
                <p className="text-xs text-white/20">{plan.payoutHours}ч выплата</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between py-2"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
          >
            <span className="text-xs text-white/40">Что покрывает</span>
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{
                transform: showDetails ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {showDetails ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-white/30">✅ Покрывает:</p>
                {selectedPlan.covers.map((item, i) => (
                  <p key={i} className="py-0.5 text-xs text-white/60">
                    • {item}
                  </p>
                ))}
              </div>

              <div>
                <p className="mb-1.5 text-xs text-white/30">💰 Примеры выплат:</p>
                {Object.entries(INJURY_PAYOUTS)
                  .slice(0, 5)
                  .map(([injury, rate]) => (
                    <div key={injury} className="flex justify-between py-0.5">
                      <span className="text-xs text-white/50">{injury}</span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "#C9A84C" }}
                      >
                        до {(selectedPlan.coverage * rate).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
              </div>

              <div>
                <p className="mb-1.5 text-xs text-white/30">❌ Не покрывает:</p>
                {selectedPlan.notCovers.map((item, i) => (
                  <p key={i} className="py-0.5 text-xs text-white/30">
                    • {item}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "0.5px solid rgba(201,168,76,0.12)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🛡️</span>
                <span className="text-xs text-white/60">
                  Страховка · {selectedPlan.name}
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "#C9A84C" }}>
                +{selectedPlan.price} ₽
              </span>
            </div>
            <p className="ml-6 mt-1 text-xs text-white/30">
              Покрытие до {selectedPlan.coverage.toLocaleString("ru-RU")} ₽ ·
              выплата за {selectedPlan.payoutHours}ч
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

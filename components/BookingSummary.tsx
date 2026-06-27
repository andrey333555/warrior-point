"use client";

type BookingSummaryProps = {
  trainingPrice: number;
  gymName: string;
};

export default function BookingSummary({
  trainingPrice,
  gymName,
}: BookingSummaryProps) {
  return (
    <div className="mt-4 rounded-2xl bg-zinc-900 p-4">
      <p className="text-sm text-gray-400">
        Тренировка: <span className="text-white">{trainingPrice}₽</span>
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Зал: <span className="text-white">{gymName}</span>
      </p>
      <p className="mt-4 text-base font-semibold text-white">
        Итого: <span className="text-yellow-400">{trainingPrice}₽</span>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

type SearchBarProps = {
  onSearch: (query: string) => void;
};

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 shrink-0 px-4">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Что посмотреть сегодня?"
          className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-all duration-300 ease-out placeholder:text-white/30 focus:ring-2 focus:ring-blue-400/50"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "0.5px solid rgba(255,255,255,0.1)",
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              onSearch("");
            }}
            aria-label="Очистить поиск"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-white/30 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </form>
  );
}

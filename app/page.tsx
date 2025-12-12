"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Illustration from "@/app/fiken/components/Illustration";

function ConnectContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  const fikenLoginUrl = `/fiken/api/auth/login?shop=${shop}`;

  return (
    <div className="relative z-10 flex justify-center pt-0 min-[480px]:pt-[600px]">
      <a
        href={fikenLoginUrl}
        target="_top"
        className="
          inline-flex items-center justify-center
          px-8 py-4
          bg-gradient-to-r from-[#6366F1] to-[#3B82F6] hover:from-[#5457E5] hover:to-[#2563EB]
          text-white font-bold text-lg
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-300 ease-in-out transform hover:-translate-y-1
        "
      >
        Connect to Fiken
      </a>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-white overflow-hidden flex flex-col items-center justify-center min-[480px]:block">
      <div className="absolute inset-0 z-0 hidden min-[480px]:block">
        <Illustration variant="full" />
      </div>

      <Suspense fallback={null}>
        <ConnectContent />
      </Suspense>
    </main>
  );
}

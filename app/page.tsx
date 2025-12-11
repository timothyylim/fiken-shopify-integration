"use client";

import { useSearchParams } from "next/navigation";
import Illustration from "@/app/fiken/components/Illustration";

export default function Home() {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  const fikenLoginUrl = `/fiken/api/auth/login?shop=${shop}`;

  return (
    <div className="flex flex-col items-center text-center pt-10">
      {/* Illustration */}
      <div className="max-w-lg mx-auto mb-6">
        <Illustration variant="full" />
      </div>

      {/* Button OR error under the illustration */}
      {shop ? (
        <a
          href={fikenLoginUrl}
          target="_top"
          className="
            inline-block
            my-[-130px]
            z-10
            px-6 py-3
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold
            rounded-lg shadow-sm
            transition
          "
        >
          Connect to Fiken
        </a>
      ) : (
        <p className="text-red-600 mt-2">
          Shopify 'shop' parameter is missing. Please launch from Shopify Admin.
        </p>
      )}
    </div>
  );
}

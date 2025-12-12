"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FikenCompany } from "@/app/types/Fiken";
import SelectArrow from "./SelectArrow";
import { fetcher } from "@/app/fiken/lib/helpers";
import useSWR from "swr";

export default function SelectCompanyForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const refreshToken = searchParams.get("refresh_token");
  const expiresIn = searchParams.get("expires_in");

  const shop = searchParams.get("shop");

  const {
    data: companies = [],
    error: swrError,
    isLoading,
  } = useSWR<FikenCompany[]>(
    token ? "/fiken/api/companies" : null,
    (url: string) => fetcher(url, token!)
  );

  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Track which specific company is currently connecting
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);

  const initialLoading = isLoading && !companies;

  if (!shop && !initialLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md shadow-sm">
          <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <img
              src="/icons/x.svg"
              alt="Error"
              className="w-6 h-6 opacity-50"
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Missing Store Information
          </h2>
          <p className="text-slate-500">
            We could not identify your Shopify store. Please return to Shopify
            and try launching the app again.
          </p>
        </div>
      </div>
    );
  }

  const handleSelect = async (companySlug: string) => {
    if (connectingSlug) return; // Prevent double clicks

    setFormError(null);
    setConnectingSlug(companySlug); // Start loading state for this item

    try {
      const res = await fetch("/fiken/api/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: shop!,
          access_token: token,
          refresh_token: refreshToken,
          expires_in: expiresIn ? parseInt(expiresIn) : 3600,
          company_slug: companySlug,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
    } catch (err: any) {
      console.error("Save Error:", err);
      setFormError("We couldn't connect to that store. Please try again.");
      setConnectingSlug(null); // Reset on error so they can try again
    }
  };

  if (initialLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium tracking-wide">
            Loading companies...
          </p>
        </div>
      </div>
    );

  if (swrError)
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md shadow-sm">
          <p className="text-slate-500">
            We're having trouble loading your companies.
          </p>
        </div>
      </div>
    );

  if (saved)
    return (
      <div className="flex h-full w-full items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
            <img src="/fiken/check.svg" alt="Success" className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Connected!</h2>
          <p className="text-slate-500 mb-8 text-lg leading-relaxed">
            <span className="text-slate-900 font-semibold">{shop}</span> is now
            linked to Fiken.
          </p>

          <a
            href={`https://${shop}/admin`}
            target="_top"
            className="inline-block w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200"
          >
            Return to Shopify
          </a>
        </div>
      </div>
    );

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Connect Shopify to Fiken
        </h1>
        <p className="text-slate-600 text-lg">
          Select the Fiken company to link with your store.
        </p>
      </div>

      <div className="space-y-10 py-8">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shopify Store
            </p>
            <p className="text-slate-900 font-medium">{shop}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
          </div>
        </div>

        {formError && (
          <p className="text-sm text-red-500 font-medium">{formError}</p>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 mb-2 pl-1">
            Select Fiken Company
          </label>
          <div className="grid gap-3">
            {companies.map((company) => {
              const isConnecting = connectingSlug === company.slug;
              const isDisabled = connectingSlug !== null;

              return (
                <button
                  key={company.slug}
                  onClick={() => handleSelect(company.slug)}
                  disabled={isDisabled}
                  className={`
                    group w-full text-left rounded-xl p-5 flex justify-between items-center transition-all duration-200
                    border
                    ${
                      isConnecting
                        ? "bg-slate-50 border-blue-300 ring-1 ring-blue-100"
                        : isDisabled
                        ? "bg-white border-slate-100 opacity-50 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
                    }
                  `}
                >
                  <div>
                    <div
                      className={`font-semibold text-lg transition-colors ${
                        isConnecting
                          ? "text-blue-700"
                          : "text-slate-900 group-hover:text-blue-600"
                      }`}
                    >
                      {company.name}
                    </div>
                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isConnecting
                            ? "bg-blue-500"
                            : "bg-slate-300 group-hover:bg-blue-500"
                        }`}
                      ></span>
                      Org:{" "}
                      <span className="font-mono">
                        {company.organizationNumber}
                      </span>
                    </div>
                  </div>

                  {/* Swap Arrow for Spinner if this item is connecting */}
                  {isConnecting ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                  ) : (
                    <SelectArrow />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

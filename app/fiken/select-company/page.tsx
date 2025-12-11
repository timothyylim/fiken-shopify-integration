"use client";

import { Suspense } from "react";
import Illustration from "@/app/fiken/components/Illustration";
import SelectCompanyForm from "../components/SelectCompanyForm";

export default function SelectCompanyPage() {
  return (
    <div className="flex min-h-screen bg-white font-sans">
      <Illustration />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
        <Suspense
          fallback={<div className="text-slate-400">Loading form...</div>}
        >
          <SelectCompanyForm />
        </Suspense>
      </div>
    </div>
  );
}

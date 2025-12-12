import clsx from "clsx";

type IllustrationProps = {
  variant?: "full" | "sidebar";
};

export default function Illustration({
  variant = "sidebar",
}: IllustrationProps) {
  const containerClasses = clsx(
    "justify-center p-12 relative overflow-hidden flex",
    {
      "hidden lg:flex w-1/2 bg-slate-50 items-center": variant === "sidebar",
      "min-h-screen w-full bg-white items-start pt-60": variant === "full",
    }
  );

  return (
    <div className={containerClasses}>
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 text-center w-full max-w-lg">
        {/* Logos & Connection Visual */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {/* Shopify Logo */}
          <div className="w-40 h-40 bg-white rounded-3xl shadow-xl flex items-center justify-center p-8 border border-slate-100 relative z-10 transition-transform hover:scale-105 duration-300">
            <img
              src="/shopify-logo.svg"
              alt="Shopify"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Connection Animation */}
          <div className="flex flex-col items-center justify-center w-24 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 border-t-2 border-dashed border-blue-300/50 -translate-y-1/2"></div>
            <div className="w-10 h-10 bg-white rounded-full shadow-md border border-blue-50 flex items-center justify-center z-10 animate-pulse">
              <img
                src="/fiken/arrow-right.svg"
                alt="Connecting"
                className="w-5 h-5"
              />
            </div>
          </div>

          {/* Fiken Logo */}
          <div className="w-40 h-40 bg-white rounded-3xl shadow-xl flex items-center justify-center p-8 border border-slate-100 relative z-10 transition-transform hover:scale-105 duration-300">
            <img
              src="/fiken-logo.svg"
              alt="Fiken"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-4">
          Seamless Integration
        </h2>
        <p className="text-slate-500 mt-4 text-lg max-w-md mx-auto leading-relaxed">
          Connect your Shopify store with Fiken to automate your bookkeeping and
          save hours every week.
        </p>
      </div>
    </div>
  );
}

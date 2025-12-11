export default function SelectArrow() {
  return (
    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-500 flex items-center justify-center transition-all duration-200 border border-slate-100 group-hover:border-blue-500">
      <img
        src="/fiken/arrow-right.svg"
        alt="Select"
        className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:brightness-[100] transition-all transform group-hover:translate-x-0.5"
      />
    </div>
  );
}

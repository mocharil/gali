export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-16 z-40 h-0.5 overflow-hidden bg-transparent">
      <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
    </div>
  );
}

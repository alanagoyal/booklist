interface BookCountProps {
  count: number;
}

export function BookCount({ count }: BookCountProps) {
  return (
    <div className="fixed bottom-4 right-4 text-[#121212/70] dark:text-[#D4C4A3/70]">
      {count} books
    </div>
  );
}

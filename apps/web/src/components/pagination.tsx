import Link from "next/link";
import { pageWindow } from "@/lib/url";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Build the URL of a given page, keeping the current filters. */
  href: (page: number) => string;
};

export function Pagination({ page, totalPages, href }: PaginationProps) {
  if (totalPages <= 1) return null;
  const item = "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      {page > 1 && (
        <Link href={href(page - 1)} className={`${item} hover:bg-slate-100`} rel="prev">
          ‹ Prev
        </Link>
      )}
      {pageWindow(page, totalPages).map((n, index) =>
        n === null ? (
          <span key={`gap-${index}`} className={`${item} text-slate-400`}>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${item} hover:bg-slate-100 aria-[current=page]:bg-emerald-600 aria-[current=page]:text-white`}
          >
            {n}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className={`${item} hover:bg-slate-100`} rel="next">
          Next ›
        </Link>
      )}
    </nav>
  );
}

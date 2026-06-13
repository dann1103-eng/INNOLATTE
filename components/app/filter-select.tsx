"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

/** Select que filtra por un parámetro de la URL. */
export function FilterSelect({
  param,
  options,
  allLabel = "Todos",
  ariaLabel,
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? "";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(param, value);
    else params.delete(param);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      aria-label={ariaLabel ?? param}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="sm:w-44"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

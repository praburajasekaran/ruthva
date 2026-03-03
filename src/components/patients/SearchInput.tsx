"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function SearchInput({ placeholder = "Search patients..." }: { placeholder?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(searchParams.get("q") ?? "");
    const debouncedValue = useDebounce(value, 300);

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedValue) {
            params.set("q", debouncedValue);
        } else {
            params.delete("q");
        }

        startTransition(() => {
            router.push(`?${params.toString()}`);
        });
    }, [debouncedValue, router, searchParams]);

    return (
        <div className="relative mb-5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5 transition-all focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20 lg:px-4">
                <Search className={`h-4 w-4 transition-colors ${isPending ? "text-brand-500 animate-pulse" : "text-text-muted"}`} />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted"
                />
                {value && (
                    <button
                        onClick={() => setValue("")}
                        className="rounded-md p-1 hover:bg-surface-sunken transition-colors"
                    >
                        <X className="h-4 w-4 text-text-muted" />
                    </button>
                )}
            </div>
        </div>
    );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-md">
            <Link href="/" className="flex items-center gap-2">
                <Image
                    src="/ruthva-logo.png"
                    alt="Ruthva Logo"
                    width={120}
                    height={32}
                    className="h-8 w-auto object-contain"
                />
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                <Link href="#how-it-works" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
                    How It Works
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <Link
                    href="/login"
                    className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-text-primary md:block"
                >
                    Sign In
                </Link>
                <Link
                    href="/login"
                    className="flex h-9 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
                >
                    Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </nav>
    );
}

import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="border-t border-border bg-white">
            <div className="mx-auto max-w-5xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
                <div className="flex justify-center space-x-6 md:order-2 text-sm text-text-secondary">
                    <Link href="/login" className="hover:text-text-primary transition-colors">
                        Doctor Login
                    </Link>
                    <span className="text-border-strong">&middot;</span>
                    <Link href="mailto:support@ruthva.com" className="hover:text-text-primary transition-colors">
                        Support
                    </Link>
                </div>
                <div className="mt-8 md:order-1 md:mt-0 flex flex-col items-center md:items-start gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/ruthva-logo.png"
                            alt="Ruthva Logo"
                            width={100}
                            height={28}
                            className="h-7 w-auto object-contain opacity-80 grayscale transition-all hover:grayscale-0"
                        />
                    </Link>
                    <p className="text-center text-xs leading-5 text-text-secondary">
                        &copy; {new Date().getFullYear()} Ruthva Continuity System. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

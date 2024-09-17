'use client'

import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit";
import SuiLogo from "@/icons/SuiLogo";

const Links = [
    {
        name: "Apps",
        href: "/apps"
    },
    {
        name: "Packages",
        href: "/packages"
    }
]

export default function Header() {
    const path = usePathname();

    console.log(path);

    return (
        <header className="border-b border-content-primary/15">
            <div className="container flex justify-between py-Regular">
                <div className="flex gap-Small items-center">
                    <SuiLogo />
                    mvr
                </div>
                {/* menu */}
                <div>
                    {
                        Links.map(({ name, href }) => (
                            <Button asChild key={name} variant={
                                path === href ? "default" : "link"
                            }>
                                <Link href={href}>{
                                    name
                                }</Link>
                            </Button>
                        ))
                    }
                </div>
                <div>
                    <ConnectButton />
                </div>

            </div>
        </header>
    )
}

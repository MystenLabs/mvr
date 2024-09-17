import SocialDiscord from "@/icons/SocialDiscord";
import SocialX from "@/icons/SocialX";
import SocialYoutube from "@/icons/SocialYoutube";
import { Button } from "./ui/button";
import Link from "next/link";

const Social = [
    {
        name: 'Discord',
        url: 'https://discord.com/invite/sui',
        icon: <SocialDiscord />
    },
    {
        name: 'Youtube',
        url: 'https://www.youtube.com/@Sui-Network',
        icon: <SocialYoutube />
    },
    {
        name: 'X',
        url: 'https://twitter.com/SuiNetwork',
        icon: <SocialX />
    },
];

export default function Footer() {
    return (
        <footer className="border-t border-border-classic ">
            <div className="container py-Regular grid lg:grid-cols-2 gap-5 items-center">
                <div>
                    <p className="font-mono text-sm text-content-tertiary -indent-6 uppercase">
                        © 2024 Sui foundation. All rights reserved.
                    </p>
                </div>
                <div className="flex justify-end gap-Small">
                    {
                        Social.map(({ name, url, icon }) => (
                            <Link href={url} key={name} target="_blank" passHref>
                                {icon}
                            </Link>
                        ))
                    }
                </div>
            </div>

        </footer>
    )
}

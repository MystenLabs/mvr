import SocialDiscord from "@/icons/SocialDiscord";
import SocialX from "@/icons/SocialX";
import SocialYoutube from "@/icons/SocialYoutube";
import { Button } from "./ui/button";
import Link from "next/link";
import { Text } from "./ui/Text";

const Menu = [
    {
        name: "Terms of Use",
        href: "/terms",
    },
    {
        name: "Privacy Policy",
        href: "/privacy-policy",
    },
]
const Social = [
  {
    name: "Discord",
    url: "https://discord.com/invite/sui",
    icon: <SocialDiscord />,
  },
  {
    name: "Youtube",
    url: "https://www.youtube.com/@Sui-Network",
    icon: <SocialYoutube />,
  },
  {
    name: "X",
    url: "https://twitter.com/SuiNetwork",
    icon: <SocialX />,
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-classic max-md:px-Regular">
      <div className="container grid items-center gap-Small py-Regular lg:grid-cols-2">
        <div className="md:flex items-center gap-Small">
          <Text variant="small/regular" mono color="tertiary" family="mono" className="uppercase pr-Small">
            © 2024 Sui foundation. All rights reserved.
          </Text>
          {
            Menu.map(({ name, href }) => (
                <Link key={name} href={href}>{
                    <Text variant="small/regular" family="mono" color="tertiary" className="uppercase hover:underline">
                        {name}
                    </Text>
                }</Link>
            ))
          }
        </div>
        <div className="flex justify-end gap-Small items-center">
          {Social.map(({ name, url, icon }) => (
            <Link key={name} href={url} target="_blank" passHref className="hover:scale-110 ease-in-out duration-300">
              {icon}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

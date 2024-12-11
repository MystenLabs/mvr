import SocialDiscord from "@/icons/SocialDiscord";
import SocialX from "@/icons/SocialX";
import SocialYoutube from "@/icons/SocialYoutube";
import { Button } from "./ui/button";
import Link from "next/link";
import { Text } from "./ui/Text";

const Menu = [
  {
    name: "FAQ",
    href: "/faq",
  },
  {
    name: "Terms of Use",
    href: "/terms",
  },
  {
    name: "Documentation",
    href: "https://docs.suins.io/move-registry",
  },
];
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
    <footer className="border-t border-border-classic">
      <div className="container items-center gap-Small py-Regular md:flex md:justify-between">
        <div className="items-center gap-Large md:flex">
          {Menu.map(({ name, href }) => (
            <Link
              key={name}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
            >
              {
                <Text
                  variant="small/regular"
                  family="mono"
                  color="tertiary"
                  className="uppercase hover:underline"
                >
                  {name}
                </Text>
              }
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-Small max-md:pt-Large">
          <Text
            variant="xsmall/regular"
            mono
            color="tertiary"
            family="mono"
            className="pr-Small uppercase max-md:text-right"
          >
            © 2024 Sui foundation. All rights reserved
          </Text>
          <div className="flex items-center justify-end gap-Small">
            {Social.map(({ name, url, icon }) => (
              <Link
                key={name}
                href={url}
                target="_blank"
                passHref
                className="duration-300 ease-in-out hover:scale-110"
              >
                {icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

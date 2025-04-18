import SocialDiscord from "@/icons/SocialDiscord";
import SocialX from "@/icons/SocialX";
import SocialYoutube from "@/icons/SocialYoutube";
import { Button } from "./ui/button";
import Link from "next/link";
import { Text } from "./ui/Text";
import NsLogo from "@/icons/NsLogo";

const Menu = [
  {
    name: "Docs",
    href: "https://docs.suins.io/move-registry",
  },
  {
    name: "FAQ",
    href: "/faq",
  },
  {
    name: "Terms of Use",
    href: "/terms",
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
    <footer className="border-stroke-secondary border-t">
      <div className="gap-md py-xs container items-center md:flex md:justify-between">
        <div className="gap-md items-center md:flex">
          {Menu.map(({ name, href }) => (
            <Link
              key={name}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
            >
              {
                <Text
                  kind="label"
                  size="label-xs"
                  className="text-content-secondary hover:underline"
                >
                  {name}
                </Text>
              }
            </Link>
          ))}
          <Text
            as="div"
            kind="paragraph"
            size="paragraph-xs"
            className="flex items-center gap-2 text-content-tertiary"
          >
            Powered By <NsLogo />
          </Text>
        </div>
        <div className="gap-md flex flex-wrap items-center justify-end max-md:pt-Large">
          <Text
            kind="label"
            size="label-xs"
            className="text-content-secondary max-md:text-right"
          >
            © {new Date().getFullYear()} Sui foundation. All rights reserved
          </Text>
          <div className="gap-xs flex items-center justify-end">
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

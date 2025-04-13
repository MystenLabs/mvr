import MvrLogo from "@/icons/MvrLogo";
import { Text } from "../ui/Text";
import { Content } from "@/data/content";

export function HomeSearchSection({ children }: { children?: React.ReactNode }) {
  return (
    <div className="container mx-auto grid grid-cols-1 gap-sm lg:max-w-[800px]">
      <MvrLogo className="mx-auto" width={54} height={66} />
      <Text as="h1" kind="display" size="display-regular" className="text-center">
        {Content.homepage.title}
      </Text>
      <Text
        as="p"
        kind="paragraph"
        size="paragraph-xl"
        className="text-center text-content-secondary"
      >
        {Content.homepage.content}
      </Text>

      {children}
    </div>
  );
}

import MvrLogo from "@/icons/MvrLogo";
import { Text } from "../ui/Text";
import { Content } from "@/data/content";
import { cn } from "@/lib/utils";

export function HomeSearchSection({
  children,
  isInputFocused,
}: {
  children?: React.ReactNode;
  isInputFocused: boolean;
}) {
  return (
    <div className="container mx-auto grid grid-cols-1 gap-sm lg:max-w-[800px]">
      <MvrLogo className="mx-auto" width={54} height={66} />
      <Text
        as="h1"
        kind="display"
        size="display-regular"
        className="text-center"
      >
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

      <div
        className={cn(
          "absolute inset-0 bg-[#000] bg-opacity-50 opacity-0 duration-300 ease-in",
          !isInputFocused && "-z-10",
          isInputFocused && "opacity-100 z-20",
        )}
      ></div>
    </div>
  );
}

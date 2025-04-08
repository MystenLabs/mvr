import { cn } from "@/lib/utils";
import { Text } from "./ui/Text";

/// EmptyState component sizes setup.
const SizeSetup = {
  icon: {
    sm: "text-[2rem]",
    md: "text-[3.5rem]",
    lg: "text-[5.5rem]",
  },
  title: {
    sm: "regular/semibold",
    md: "heading/semibold",
    lg: "display/semibold",
  },
  description: {
    sm: "small/regular",
    md: "small/regular",
    lg: "regular/regular",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  children,
  size = "lg",
  useCard = false,
}: {
  size?: "sm" | "md" | "lg";
  icon?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  useCard?: boolean;
}) {
  const sizeToTitleSize = {
    sm: "display-xs",
    md: "display-small",
    lg: "display-regular",
  };

  const sizeToDescriptionSize = {
    sm: "paragraph-xs",
    md: "paragraph-small",
    lg: "paragraph-regular",
  };

  return (
    <div className={`container flex flex-grow items-center justify-center`}>
      <div className={cn("text-center", useCard && "bg-bg-secondary px-2xl py-3xl rounded-xl")}>
        {icon && <h1 className={SizeSetup.icon[size]}>{icon}</h1>}

        {title && (
          <Text
            kind="display"
            // @ts-ignore-next-line
            size={sizeToTitleSize[size]}
            className="mx-auto max-w-[700px] text-center text-content-primary"
          >
            {title}
          </Text>
        )}
        {description && (
          <Text
            kind="paragraph"
            // @ts-ignore-next-line
            size={sizeToDescriptionSize[size]}
            className="mx-auto max-w-[550px] pt-sm text-center"
          >
            {description}
          </Text>
        )}
        <div className="py-lg">{children}</div>
      </div>
    </div>
  );
}

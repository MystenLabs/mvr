import { Text } from "./ui/Text";

export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-[85vh] items-center justify-center">
      <div className="text-center">
        {icon && <h1 className="text-[6rem]">{icon}</h1>}

        {title && (
          <Text variant="display/semibold" className="mx-auto max-w-[700px] text-center" color="secondary">
            {title}
          </Text>
        )}
        {description && (
          <Text
            variant="regular/regular"
            color="secondary"
            family="inter"
            className="mx-auto max-w-[550px] pt-Small text-center"
          >
            {description}
          </Text>
        )}
        <div className="py-Large">{children}</div>
      </div>
    </div>
  );
}

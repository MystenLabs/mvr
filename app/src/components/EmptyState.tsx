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
          <Text variant="md/regular" className="text-center">
            {title}
          </Text>
        )}
        {description && (
          <Text
            variant="sm/regular"
            className="mx-auto max-w-[450px] pt-Small text-center"
          >
            {description}
          </Text>
        )}
        <div className="py-Small">{children}</div>
      </div>
    </div>
  );
}

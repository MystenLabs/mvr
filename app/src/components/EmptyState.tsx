import { Text } from "./ui/Text";

/// EmptyState component sizes setup.
const SizeSetup = {
  icon: {
    sm: 'text-[3rem]',
    md: 'text-[4.5rem]',
    lg: 'text-[6rem]',
  },
  title: {
    sm: 'regular/semibold',
    md: 'heading/semibold',
    lg: 'display/semibold',
  },
  description: {
    sm: 'small/regular',
    md: 'small/regular',
    lg: 'regular/regular',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  size = 'lg',
}: {
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex-grow flex items-center justify-center container`}>
      <div className="text-center">
        {icon && <h1 className={SizeSetup.icon[size]}>{icon}</h1>}

        {title && (
          // @ts-ignore-next-line
          <Text variant={SizeSetup.title[size]} className="mx-auto max-w-[700px] text-center" color="secondary">
            {title}
          </Text>
        )}
        {description && (
          <Text
            // @ts-ignore-next-line
            variant={SizeSetup.description[size]}
            color="secondary"
            family="inter"
            className="mx-auto max-w-[550px] pt-Small text-center"
          >
            {description}
          </Text>
        )}
        <div className="py-lg">{children}</div>
      </div>
    </div>
  );
}

import { Text } from "./ui/Text";



export function EmptyState({
    icon,
    title,
    description,
    children
}: {
    icon?: string
    title?: string
    description?: string,
    children?: React.ReactNode
}) {
    return (
        <div className="h-[85vh] flex items-center justify-center">
            <div className="text-center">
                {
                    icon && (
                        <h1 className="text-[6rem]">
                            {icon}
                        </h1>
                    )
                }
                <Text variant="md/regular" className="text-center">
                    No data available
                </Text>
                {children}
            </div>
        </div>
    )
}

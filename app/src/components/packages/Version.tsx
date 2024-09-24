import { GitVersion } from "@/hooks/useVersionsTable";
import { Text } from "../ui/Text";


export function Version({version}: {version: GitVersion}) {
    return (
        <div className="grid grid-cols-1 gap-XXSmall">
            <Text variant="xxsmall/semibold" color="tertiary" className="uppercase" family="inter">{version.action === 'add' && '(+)'} Version {version.version}</Text>
            <Text variant="small/regular" color="secondary" family="inter">Git URL: <span className="text-content-primary">{version.repository}</span></Text>
            <Text variant="small/regular" color="secondary" family="inter">Path: <span className="text-content-primary">{version.path || '-'}</span></Text>
            <Text variant="small/regular" color="secondary" family="inter">Tag / Branch: <span className="text-content-primary">{version.tag || '-'}</span></Text>
        </div>
    )
}

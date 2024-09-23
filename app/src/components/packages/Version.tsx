import { GitVersion } from "@/hooks/useVersionsTable";


export function Version({version}: {version: GitVersion}) {
    return (
        <div>
            <div>{version.version}</div>
            <div>{version.repository}</div>
            <div>{version.path}</div>
            <div>{version.tag}</div>
        </div>
    )
}

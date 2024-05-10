import { TransactionArgument, TransactionBlock, TransactionObjectArgument } from "@mysten/sui.js/transactions";

export type PackageInfoStyle = {
    backgroundColor: string;
    titleColor: string;
    packageColor: string;
};

export type GithubPackageInfo = {
    githubRepository: string;
    githubSubdirectory: string;
    githubTag: string;
};

export class PackageInfo {
    transactionBlock: TransactionBlock;
    packageId: string;
    info: TransactionObjectArgument | undefined;

    constructor(transactionBlock: TransactionBlock, packageId: string, packageInfo?: TransactionObjectArgument){
        this.transactionBlock = transactionBlock;
        this.packageId = packageId;
        if (packageInfo) this.info = this.transactionBlock.object(packageInfo);

        return this;
    }

    new(upgradeCap: TransactionObjectArgument) {
        if (this.info) throw new Error("PackageInfo already initialized");

        this.info = this.transactionBlock.moveCall({
            target: `${this.packageId}::package_info::new`,
            arguments: [
                this.transactionBlock.object(upgradeCap)
            ],
        });

        return this;
    }

    setLabel(label: string) {
        this.#checkInitialized();

        this.transactionBlock.moveCall({
            target: `${this.packageId}::package_info::set_label`,
            arguments: [
                this.info,
                this.transactionBlock.pure.string(label),
            ],
        });

        return this;
    }

    setStyle({ backgroundColor, titleColor, packageColor }: PackageInfoStyle) {
        this.#checkInitialized();

        const style = this.transactionBlock.moveCall({
            target: `${this.packageId}::style::new`,
            arguments: [
                this.transactionBlock.pure.string(backgroundColor),
                this.transactionBlock.pure.string(titleColor),
                this.transactionBlock.pure.string(packageColor),
            ],
        });

        this.transactionBlock.moveCall({
            target: `${this.packageId}::package_info::set_style`,
            arguments: [
                this.info,
                style,
            ],
        });

        return this;
    }

    setGitVersioning(version: number, githubInfo: GithubPackageInfo) {
        this.#checkInitialized();
        
        const github = this.transactionBlock.moveCall({
            target: `${this.packageId}::git::new`,
            arguments: [
                this.transactionBlock.pure.string(githubInfo.githubRepository),
                this.transactionBlock.pure.string(githubInfo.githubSubdirectory),
                this.transactionBlock.pure.string(githubInfo.githubTag),
            ],
        });

        this.transactionBlock.moveCall({
            target: `${this.packageId}::package_info::set_git_versioning`,
            arguments: [
                this.info,
                this.transactionBlock.pure.u64(version),
                github,
            ],
        });

        return this;
    }

    tranfer({ to, selfTransfer } : {to?: TransactionArgument; selfTransfer?: boolean}) {
        this.#checkInitialized();
        this.transactionBlock.moveCall({
            target: `${this.packageId}::package_info::transfer`,
            arguments: [
                this.info,
                selfTransfer ? this.transactionBlock.moveCall({ target: '0x2::tx_context::sender' }) : to
            ],
        });
    }

    #checkInitialized() {
        if (!this.info) throw new Error("PackageInfo not initialized");
    }
}

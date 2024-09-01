import { TransactionArgument, Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { sender } from "../../utils";

export type PackageInfoStyle = {
    backgroundColor: string;
    titleColor: string;
    packageColor: string;
};

export type GithubPackageInfo = {
    gitRepository: string;
    gitSubdirectory: string;
    gitTag: string;
};

export class PackageInfo {
    transaction: Transaction;
    packageId: string;
    info: TransactionObjectArgument | string | undefined;

    constructor(transaction: Transaction, packageId: string, packageInfo?: TransactionObjectArgument | string){
        this.transaction = transaction;
        this.packageId = packageId;
        if (packageInfo) this.info = this.transaction.object(packageInfo);

        return this;
    }

    new(upgradeCap: TransactionObjectArgument | string) {
        if (this.info) throw new Error("PackageInfo already initialized");

        this.info = this.transaction.moveCall({
            target: `${this.packageId}::package_info::new`,
            arguments: [
                this.transaction.object(upgradeCap)
            ],
        });

        return this;
    }

    setLabel(label: string) {
        this.#checkInitialized();

        this.transaction.moveCall({
            target: `${this.packageId}::package_info::set_label`,
            arguments: [
                this.transaction.object(this.info!),
                this.transaction.pure.string(label),
            ],
        });

        return this;
    }

    setStyle({ backgroundColor, titleColor, packageColor }: PackageInfoStyle) {
        this.#checkInitialized();

        const style = this.transaction.moveCall({
            target: `${this.packageId}::style::new`,
            arguments: [
                this.transaction.pure.string(backgroundColor),
                this.transaction.pure.string(titleColor),
                this.transaction.pure.string(packageColor),
            ],
        });

        this.transaction.moveCall({
            target: `${this.packageId}::package_info::set_style`,
            arguments: [
                this.transaction.object(this.info!),
                style,
            ],
        });

        return this;
    }

    setGitVersioning(version: number, gitInfo: GithubPackageInfo) {
        this.#checkInitialized();
        
        const git = this.transaction.moveCall({
            target: `${this.packageId}::git::new`,
            arguments: [
                this.transaction.pure.string(gitInfo.gitRepository),
                this.transaction.pure.string(gitInfo.gitSubdirectory),
                this.transaction.pure.string(gitInfo.gitTag),
            ],
        });

        this.transaction.moveCall({
            target: `${this.packageId}::package_info::set_git_versioning`,
            arguments: [
                this.transaction.object(this.info!),
                this.transaction.pure.u64(version),
                git,
            ],
        });

        return this;
    }

    tranfer({ to, selfTransfer } : {to?: TransactionArgument; selfTransfer?: boolean}) {
        this.#checkInitialized();
        this.transaction.moveCall({
            target: `${this.packageId}::package_info::transfer`,
            arguments: [
                this.transaction.object(this.info!),
                selfTransfer ? sender(this.transaction) : to!
            ],
        });
    }

    #checkInitialized() {
        if (!this.info) throw new Error("PackageInfo not initialized");
    }
}

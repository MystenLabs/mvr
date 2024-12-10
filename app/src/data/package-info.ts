import { sender } from "@/lib/utils";
import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

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
  info: TransactionObjectArgument | string | undefined;

  constructor(
    transaction: Transaction,
    packageInfo?: TransactionObjectArgument | string,
  ) {
    this.transaction = transaction;
    if (packageInfo) this.info = this.transaction.object(packageInfo);

    return this;
  }

  new(upgradeCap: TransactionObjectArgument | string) {
    if (this.info) throw new Error("PackageInfo already initialized");

    this.info = this.transaction.moveCall({
      target: `@mvr/metadata::package_info::new`,
      arguments: [this.transaction.object(upgradeCap)],
    });

    return this;
  }

  setDisplay(
    label: string,
    gradientFrom: string, 
    gradientTo: string,
    textColor: string,
  ) {
    this.#checkInitialized();

    const display = this.transaction.moveCall({
      target: `@mvr/metadata::display::new`,
      arguments: [
        this.transaction.pure.string(label),
        this.transaction.pure.string(gradientFrom),
        this.transaction.pure.string(gradientTo),
        this.transaction.pure.string(textColor),
      ],
    });

    this.transaction.moveCall({
      target: `@mvr/metadata::package_info::set_display`,
      arguments: [this.transaction.object(this.info!), display],
    });

    return this;
  }

  setGitVersioning(version: number, gitInfo: GithubPackageInfo) {
    this.#checkInitialized();

    const git = this.transaction.moveCall({
      target: `@mvr/metadata::git::new`,
      arguments: [
        this.transaction.pure.string(gitInfo.gitRepository),
        this.transaction.pure.string(gitInfo.gitSubdirectory),
        this.transaction.pure.string(gitInfo.gitTag),
      ],
    });

    this.transaction.moveCall({
      target: `@mvr/metadata::package_info::set_git_versioning`,
      arguments: [
        this.transaction.object(this.info!),
        this.transaction.pure.u64(version),
        git,
      ],
    });

    return this;
  }

  tranfer({
    to,
    selfTransfer,
  }: {
    to?: TransactionArgument;
    selfTransfer?: boolean;
  }) {
    this.#checkInitialized();
    this.transaction.moveCall({
      target: `@mvr/metadata::package_info::transfer`,
      arguments: [
        this.transaction.object(this.info!),
        selfTransfer ? sender(this.transaction) : to!,
      ],
    });
  }

  #checkInitialized() {
    if (!this.info) throw new Error("PackageInfo not initialized");
  }
}

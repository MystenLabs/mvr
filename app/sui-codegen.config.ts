import type { SuiCodegenConfig } from "@mysten/codegen";

// Generates BCS + moveCall bindings for the MVR packages, consumed by the data
// hooks to parse on-chain object content. Regenerate with `pnpm codegen` (needs
// the sui CLI switched to mainnet — it fetches package summaries by id).
//
// NOTE: on-chain codegen bakes the numeric (network-specific) package address
// into struct type tags, so we do NOT use `.typeTag()` for object-type filters.
// Hooks pass the `@mvr/...` MVR name string instead, which the gRPC client
// resolves per-network. These bindings are used for `.parse()` (network-agnostic
// BCS decoding) and would need local-source codegen to carry MVR names.
const config: SuiCodegenConfig = {
  output: "./src/contracts",
  // Extensionless imports so the Next.js/webpack bundler resolves them.
  importExtension: "",
  packages: [
    {
      package:
        "0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54",
      packageName: "mvr_core",
      network: "mainnet",
    },
    {
      package:
        "0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98",
      packageName: "mvr_metadata",
      network: "mainnet",
    },
    // Sui framework — scoped to the `package` module for UpgradeCap.
    {
      package:
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      packageName: "sui",
      network: "mainnet",
      generate: { modules: ["package"] },
    },
  ],
};

export default config;

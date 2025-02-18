# WARNING
This is a **DEVELOPER PREVIEW** of the Move Registry. It is EXPERIMENTAL and has NO GUARANTEES of uptime or correctness. USE AT YOUR OWN RISK.

# Move Registry
Move Registry is a name registration system for Move packages. You can use an MVR app any time you would previously use a 64-character hex address.

MVR integrates into Sui developer tooling, enabling developers to manage dependencies in a similar manner to NPM or Cargo, but targeted to the needs of Sui builders. By using an MVR app in your PTBs, your PTB will always use the latest version of the package, rather than having to update the address of the package you are calling on-chain. 

With MVR, builders can feel secure about which packages they’re actually calling, because their code has human-readable names and not inscrutable series of letters and numbers. MVR is open-source and uses immutable records on Sui as the source of truth. Further, MVR encourages Sui builders to make their packages open-source and easy to integrate into other projects.

In the future, MVR will add features to surface other trust signals to make package selection easier, including auditor reports. Our hope is that MVR becomes the repository of Move packages in the same sense as NPM or Cargo, but built for the decentralized world.

# Documentation
Detailed documentation is available here: [https://docs.suins.io/move-registry](https://docs.suins.io/move-registry)

# MVR Web App
Use the Web App to register your package: [https://www.moveregistry.com/apps](https://www.moveregistry.com/apps)

# Using MVR

Currently, there are two main surfaces to use MVR.

* You can use MVR while *building* Move code, to manage your dependencies. For more on this, see [README.md](crates/mvr-cli/README.md).
* You can use MVR while *calling* Move code in [Programmable Transaction Blocks](https://docs.sui.io/concepts/transactions/prog-txn-blocks). See the docs for such an example using the TypeScript SDK: [https://docs.suins.io/move-registry/tooling/typescript-sdk](https://docs.suins.io/move-registry/tooling/typescript-sdk)

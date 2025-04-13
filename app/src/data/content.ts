// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export const Content = {
  emptyStates: {
    package: {
      icon: "📦",
      title: "Publish your package first.",
      description:
        "Before you start using this, you need to have a package published. Once you have a package published, come back to manage it.",
      button: "Learn more",
      url: "https://docs.sui.io/guides/developer/first-app/publish",
    },
    wallet: {
      icon: "👋🏽",
      title: "Connect your wallet",
      description: "To get started, connect your wallet.",
      button: "Read our FAQ",
    },
    suinsNames: {
      icon: "🚀",
      title: "Let's get started!",
      description:
        "You need a SuiNS name to register your first app. Create a SuiNS name by clicking the button below.",
      button: "Visit suins.io to get a name for your org / project",
    },
    versions: {
      icon: "🔍",
      title: "No versions found",
      description:
        "It seems like you have no versions. Create a new version by clicking the button below.",
      button: "Create a Version",
    },
    apps: {
      icon: "🧑‍💻",
      title: "Onwards.",
      description: "Create your first package by clicking the button below.",
      button: "Add package",
    },

    noPackageSelected: {
      title: "Select a package",
      description: "Select a package from the navigation to view its details.",
    },

    packageNotFound: {
      icon: "📦",
      title: "Package not found",
      description:
        "The package you are looking for does not exist, or it does not metadata connected neither on mainnet nor testnet.",
      button: "Go back to the packages page",
    },
  },
  suinsNames: {
    icon: "🚀",
    title: "Let's get started!",
    description: "Which organization will you be managing packages for?",
    button: "Visit suins.io to get a name for your org / project",
  },
  package: {
    icon: "📦",
    title: "Let's get started!",
    description:
      "It seems like you have some packages. Create a new package metadata object by clicking the button below.",
    button: "Create new Metadata",
  },
  invalidCap: {
    icon: "❌",
    title: "Invalid Cap",
    description:
      "The cap you are using is no longer valid to manage this app. Please make sure you are using the correct cap.",
    button: "Burn object",
  },
  loading: {
    title: "Loading...",
    description: "Please wait while we fetch the data for you.",
  },
  noPackageConnected: {
    icon: "📦",
    title: "No active connection.",
    description:
      "No package ID connected. This package does not have a mainnet ID connected. Add an ID so MVR resoution gets enabled.",
    button: "Select a metadata object",
  },

  app: {
    button: "Create another Package",
    connected: {
      title: "There is an active connection",
      description: "This package is connected on",
      button: "View Details",
    },
  },

  addressPlaceholder: "Enter your custom address (e.g. 0xdee)",

  networkMissmatch: (network: string) =>
    `The active wallet\'s network does not match the network of the application (${network}). Switch your wallet's network to avoid unexpected failures.`,

  homepage: {
    title: "Move Package Registry",
    content:
      "MVR is the central hub for discovering, sharing, and managing Move packages on the Sui blockchain. Build secure, scalable, and innovative decentralized applications with the power of Move.",
    docs: {
      title: "Move onto MVR",
      paragraph: "Bring your package to the future of Move.",
      register: "Register your app",
      viewDocs: "View MVR Docs",
      docsUrl: "https://docs.suins.io/move-registry",
      registerUrl: "/apps",
    },
    share: {
      title: "Share your package on MVR",
      subtitle:
        "Ready to dive in? Follow these steps to start building on MVR today.",
      steps: [
        {
          title: "Set up MVR CLI",
          description: `Install the [MVR command line](#link) tool to interact with MVR.`,
          code: "cargo install --locked --git https://github.com/mystenlabs/mvr --branch release mvr",
        },
        {
          title: "Resolve packages",
          description: `Verify your configuration to ensure that your packages are resolving properly.`,
          code: "mvr resolve @deepbook/core --network mainnet",
        },
        {
          title: "Add Dependencies",
          description: `Unlock seamless dependency management with just one simple command!`,
          code: "mvr add @deepbook/core --network mainnet",
        },
      ],
    },
    ptbs: {
      title: "Power up your PTB Dev Experience",
      subtitle: "MVR speeds up your development process.",
      typescript: {
        tabTitle: "Typescript",
        setup: {
          title: "Before MVR",
          code: `import { namedPackagesPlugin, Transaction } from "@mysten/sui/transactions"; 

Transaction.registerGlobalSerializationPlugin(
     'namedPackagesPlugin', 
     namedPackagesPlugin({ url: '<endpoint based on network>' })
);`,
        },

        withMvr: {
          title: "After MVR",
          code: `const transaction = new Transaction();

transaction.moveCall({   
     target: '@suifrens/accessories::accessories::equip',    
     arguments: [..],    
     typeArguments: [        
          '@suifrens/core::suifren::SuiFren<@suifrens/core::bullshark::Bullshark>'    
     ]
})`,
        },

        withoutMvr: {
          title: "Without MVR",
          code: `const transaction = new Transaction();
          
// Mainnet version
transaction.moveCall({
     target: '0xe177697e191327901637f8d2c5ffbbde8b1aaac27ec1024c4b62d1ebd1cd7430::accessories::equip',
     arguments: [..],
     typeArguments: [     '0x80d7de9c4a56194087e0ba0bf59492aa8e6a5ee881606226930827085ddf2332::suifren::SuiFren<0x297d8afb6ede450529d347cf9254caeea2b685c8baef67b084122291ebaefb38::bullshark::Bullshark>'
     ]
});

// Testnet version
transaction.moveCall({
     target: '0x54800ebb4606fd0c03b4554976264373b3374eeb3fd63e7ff69f31cac786ba8c::accessories::equip',
     arguments: [..],
     typeArguments: [
          '0xee496a0cc04d06a345982ba6697c90c619020de9e274408c7819f787ff66e1a1::suifren::SuiFren<0x8894fa02fc6f36cbc485ae9145d05f247a78e220814fb8419ab261bd81f08f32::bullshark::Bullshark>'
     ]
});`,
        },
      },
      cli: {
        tabTitle: "Sui CLI",
      },
    },
  },
};

export const FAQContent = {
  title: "Frequently Asked Questions",
  content:
    "We have gathered some of the most frequently asked questions and answers for you. If you have any other questions, feel free to reach out to us.",
  items: [
    {
      title: "What is MVR? ",
      content: `MVR is a name registration system for Move packages. You can use an MVR app any time you would previously use a 64-character hex address. 
      <br/>MVR integrates into Sui developer tooling, enabling developers to manage dependencies in a similar manner to NPM or Cargo, but targeted to the needs of Sui builders. <br/>By using an MVR app in your PTBs, your PTB will always use the latest version of the package, rather than having to update the address of the package you are calling on-chain. <br/>With MVR, builders can feel secure about which packages they’re actually calling, because their code has human-readable names and not inscrutable series of letters and numbers. MVR is open-source and uses immutable records on Sui as the source of truth. <br/>Further, MVR encourages Sui builders to make their packages open-source and easy to integrate into other projects. In the future, MVR will add features to surface other trust signals to make package selection easier, including auditor reports. Our hope is that MVR becomes the repository of Move packages in the same sense as NPM or Cargo, but built for the decentralized world.`,
    },
    {
      title: "Why would I want to use MVR?",
      content: `The first advantage of using MVR is reducing the maintenance burden in your own PTBs. Rather than having to update package addresses and type versions after each upgrade, you can write your PTBs against a logical name for your Move package. Instead of determining the right version for each of your types for each network you want to test on, you can just use MVR. This makes it easier for novice blockchain developers to build on Sui, because it elides the complexity of versions, package addresses, and how these interact across networks. The second advantage of MVR is making it easier to add your package as a dependency, both for yourself and others. MVR handles linking to source packages and also allows transparent switching between Testnet and Mainnet versions of packages when you are building Move code against a different environment.`,
    },
    {
      title: "What does MVR stand for?",
      content: `Move Registry.`,
    },
    {
      title: "How do I register an MVR name?",
      content: `First, register a SuiNS name. MVR names are scoped within a SuiNS name. If your SuiNS name is @name (previously name.sui), and you want to create an MVR name called app, the MVR name will be @name/app. Next, upload your Move package on Testnet or Mainnet. Finally, navigate to the MVR frontend and complete the registration flow.`,
    },
    {
      title: "Can I register a MVR name for a package I do not own?",
      content: `You must own a package to connect a MVR name to it. Access to the package's UpgradeCap is a pre-requisite to creating your Metadata object.`,
    },
    {
      title: "What's the difference between apps and packages?",
      content: `An MVR app name can point to the latest or any particular version (numbered consecutively from 1) of a package. More than one MVR app can be configured to point to the same package.`,
    },
    {
      title: "What metadata is saved under an application?",
      content: `An MVR record contains two pieces of important data: The package address on chain, and the source code for Move packages depending on the MVR record's package. This is an off-chain URL (for now) that must, at the time of registration, contain an address field in the Move.toml or Move.lock file`,
    },
    {
      title: "What aspects of MVR records are immutable?",
      content: `After an MVR record has been set to point at a particular package, it can only ever point to that package or upgraded versions of that package. This is to prevent bait-and-switch attacks. However, the source code location of the package can be changed at any time.`,
    },
    {
      title: "What are the performance characteristics of using MVR?",
      content: `Using MVR in a PTB will incur one lookup request to the MVR indexer or another GraphQL endpoint, per address, per session. Addresses are cached during sessions, and are cleared on page refresh.`,
    },
    {
      title: "How much does a MVR name cost?",
      content: `MVR records are free. You just need a SuiNS name for them to live under.`,
    },
    {
      title: "How can I get support for MVR?",
      content: `See <a href="https://sui.io/developers#support" target="_blank">https://sui.io/developers#support</a>. Quick questions should be asked in Discord or Telegram. To get unblocked on larger issues, consider signing up for Sui Engineering Office Hours.`,
    },
    {
      title:
        "What happens if the SuiNS name I registered my MVR package with expires?",
      content: `Your MVR name will not be impacted as long as it has been made immutable by registering a package on Mainnet. If you have not registered a package, the new SuiNS name owner can re-register your MVR name.`,
    },
  ],
};

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
      title: "Connect your wallet or enter a custom address",
      description:
        "To get started, connect your wallet or use a custom address.",
      button: "Read our FAQ",
    },
    suinsNames: {
      icon: "🚀",
      title: "Let's get started!",
      description:
        "You need a SuiNS name to register your first app. Create a SuiNS name by clicking the button below.",
      button: "Visit suins.io to get a name",
    },
    versions: {
      title: "No versions found",
      description:
        "It seems like you have no versions. Create a new version by clicking the button below.",
      button: "Create a Version",
    },
    apps: {
      icon: "🧑‍💻",
      title: "Onwards.",
      description:
        "Create your first application by clicking the button below.",
      button: "Add an Application",
    },
  },
  suinsNames: {
    icon: "🚀",
    title: "Let's get started!",
    description:
      "Select a name from your owned names to start managing your applications.",
    button: "Visit suins.io to get a name",
  },
  package: {
    icon: "📦",
    title: "Let's get started!",
    description:
      "It seems like you have some packages. Create a new package metadata object by clicking the button below.",
    button: "Create a Package metadata NFT",
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
    title: "No package connection.",
    description:
      "This application does not have a package connected on this network. Connect your package so MVR resolution gets enabled.",
    button: "Edit Application",
  },

  app: {
    button: "Create another Application",
  },

  addressPlaceholder: "Enter your custom address (e.g. 0xdee)",

  networkMissmatch: (network: string) =>
    `The active wallet\'s network does not match the network of the application (${network}). Switch your wallet's network to avoid unexpected failures.`,
};

export const FAQContent = {
  title: "Frequently Asked Questions",
  content:
    "We have gathered some of the most frequently asked questions and answers for you. If you have any other questions, feel free to reach out to us.",
  items: [
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
      Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
      It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
      It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
      like Aldus PageMaker including versions of Lorem Ipsum`,
    },
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
        It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
        like Aldus PageMaker including versions of Lorem Ipsum`,
    },
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
        It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
        like Aldus PageMaker including versions of Lorem Ipsum`,
    },
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
        It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
        like Aldus PageMaker including versions of Lorem Ipsum`,
    },
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
        It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
        like Aldus PageMaker including versions of Lorem Ipsum`,
    },
    {
      title: "What is Lorem Ipsum?",
      content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. 
        It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software 
        like Aldus PageMaker including versions of Lorem Ipsum`,
    },
  ],
};

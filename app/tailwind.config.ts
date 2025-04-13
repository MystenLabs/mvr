import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    colors: {
      transparent: "transparent",

      // Accent colors
      accent: {
        green: "var(--color-accent-green)",
        greenOp12: "var(--color-accent-green-op12)",
        greenOp16: "var(--color-accent-green-op16)",
        greenOp32: "var(--color-accent-green-op32)",
        green2: "var(--color-accent-green2)",
        green2Op8: "var(--color-accent-green2-op8)",
        purple: "var(--color-accent-purple)",
        purpleOp12: "var(--color-accent-purple-op12)",
        purpleOp16: "var(--color-accent-purple-op16)",
        purpleOp32: "var(--color-accent-purple-op32)",
        red: "var(--color-accent-red)",
        redOp8: "var(--color-accent-red-op8)",
        salmon: "var(--color-accent-salmon)",
        salmonOp12: "var(--color-accent-salmon-op12)",
        salmonOp16: "var(--color-accent-salmon-op16)",
        salmonOp32: "var(--color-accent-salmon-op32)",
        yellow: "var(--color-accent-yellow)",
        yellowOp8: "var(--color-accent-yellow-op8)",
      },

      bg: {
        org: {
          blue: "var(--bg-org-blue)",
          green: "var(--bg-org-green)",
          orange: "var(--bg-org-orange)",
          pink: "var(--bg-org-pink)",
          purple: "var(--bg-org-purple)",
          red: "var(--bg-org-red)",
          turquoise: "var(--bg-org-turquoise)",
          yellow: "var(--bg-org-yellow)",
        },
        overlay: "var(--bg-overlay)",
        positive: "var(--bg-positive)",
        positiveBleedthrough: "var(--bg-positive-bleedthrough)",
        primary: "var(--bg-primary)",
        primaryBleedthrough1: "var(--bg-primary-bleedthrough1)",
        primaryBleedthrough2: "var(--bg-primary-bleedthrough2)",
        secondary: "var(--bg-secondary)",
        tertiary: "var(--bg-tertiary)",
        quarternary: "var(--bg-quarternary)",
        quarternaryBleedthrough: "var(--bg-quarternary-bleedthrough)",
        warning: "var(--bg-warning)",
        warningBleedthrough: "var(--bg-warning-bleedthrough)",
        accent: "var(--bg-accent)",
        accentBleedthrough1: "var(--bg-accent-bleedthrough1)",
        accentBleedthrough2: "var(--bg-accent-bleedthrough2)",
        accentBleedthrough3: "var(--bg-accent-bleedthrough3)",
        negative: "var(--bg-negative)",
        negativeBleedthrough: "var(--bg-negative-bleedthrough)",
      },

      // Content tokens
      content: {
        primary: "var(--content-primary)",
        primaryBleedthrough1: "var(--content-primary-bleedthrough1)",
        primaryBleedthrough2: "var(--content-primary-bleedthrough2)",
        primaryInverse: "var(--content-primary-inverse)",
        secondary: "var(--content-secondary)",
        tertiary: "var(--content-tertiary)",
        positive: "var(--content-positive)",
        negative: "var(--content-negative)",
        warning: "var(--content-warning)",
        accent: "var(--content-accent)",
        accentBleedthrough1: "var(--content-accent-bleedthrough1)",
        accentBleedthrough2: "var(--content-accent-bleedthrough2)",
        accentBleedthrough3: "var(--content-accent-bleedthrough3)",
      },

      // Pastel
      pastel: {
        blue: "var(--color-pastel-blue)",
        green: "var(--color-pastel-green)",
        orange: "var(--color-pastel-orange)",
        pink: "var(--color-pastel-pink)",
        purple: "var(--color-pastel-purple)",
        red: "var(--color-pastel-red)",
        turquoise: "var(--color-pastel-turquoise)",
        yellow: "var(--color-pastel-yellow)",
      },

      // Stroke tokens
      stroke: {
        primary: "var(--stroke-primary)",
        secondary: "var(--stroke-secondary)",
        accent: "var(--stroke-accent)",
        negative: "var(--stroke-negative)",
      },

      // Greys
      grey: {
        100: "var(--color-grey-100)",
        200: "var(--color-grey-200)",
        300: "var(--color-grey-300)",
        "300Op32": "var(--color-grey-300-op32)",
        400: "var(--color-grey-400)",
        500: "var(--color-grey-500)",
        600: "var(--color-grey-600)",
        700: "var(--color-grey-700)",
        "700Op24": "var(--color-grey-700-op24)",
        "700Op48": "var(--color-grey-700-op48)",
        "700Op80": "var(--color-grey-700-op80)",
      },

      white: {
        100: "var(--color-white-100)",
        "100Op16": "var(--color-white-100-op16)",
        "100Op48": "var(--color-white-100-op48)",
      },
    },
    extend: {
      backgroundImage: {
        primaryBtnGradient: "var(--primary-btn-gradient)",
        header: "var(--header-gradient)",
        testnetSearch: "var(--testnet-search-gradient)",
        mainnetSearch: "var(--mainnet-search-gradient)",
        homepageCard: "var(--home-page-cards)",
        purpleSalmonOp12: "var(--purple-salmon-op12)",
        bluePurpleOp9: "var(--blue-purple-op9)",
        purpleBlue: "var(--purple-blue)",
      },
      borderRadius: {
        none: "var(--size-0)",
        xs: "var(--size-1)",
        sm: "var(--size-2)",
        md: "var(--size-3)",
        lg: "var(--size-4)",
        xl: "var(--size-6)",
        "2xl": "var(--size-8)",
        full: "var(--size-20)",
      },
      gap: {
        none: "var(--size-0)",
        "2xs": "var(--size-1)",
        xs: "var(--size-2)",
        sm: "var(--size-3)",
        md: "var(--size-4)",
        lg: "var(--size-6)",
        xl: "var(--size-8)",
        "2xl": "var(--size-10)",
        "3xl": "var(--size-13)",
        "4xl": "var(--size-15)",
        "5xl": "var(--size-19)",
      },

      spacing: {
        none: "var(--size-0)",
        "2xs": "var(--size-1)",
        xs: "var(--size-2)",
        sm: "var(--size-3)",
        md: "var(--size-4)",
        lg: "var(--size-6)",
        xl: "var(--size-8)",
        "2xl": "var(--size-10)",
        "3xl": "var(--size-13)",
        "4xl": "var(--size-15)",
        "5xl": "var(--size-19)",
      },
      fontSize: {
        "12": "var(--text-12)",
        "14": "var(--text-14)",
        "16": "var(--text-16)",
        "18": "var(--text-18)",
        "20": "var(--text-20)",
        "24": "var(--text-24)",
        "28": "var(--text-28)",
        "32": "var(--text-32)",
        "36": "var(--text-36)",
        "40": "var(--text-40)",
        "44": "var(--text-44)",
        "48": "var(--text-48)",
        "52": "var(--text-52)",
        "56": "var(--text-56)",
        "64": "var(--text-64)",
        "72": "var(--text-72)",
        "80": "var(--text-80)",
        "88": "var(--text-88)",
        "96": "var(--text-96)",
        "112": "var(--text-112)",
      },
      leading: {
        12: "var(--lh-12)",
        14: "var(--lh-14)",
        16: "var(--lh-16)",
        18: "var(--lh-18)",
        20: "var(--lh-20)",
        24: "var(--lh-24)",
        28: "var(--lh-28)",
        32: "var(--lh-32)",
        36: "var(--lh-36)",
        40: "var(--lh-40)",
        44: "var(--lh-44)",
        48: "var(--lh-48)",
        56: "var(--lh-56)",
        64: "var(--lh-64)",
        72: "var(--lh-72)",
        80: "var(--lh-80)",
        88: "var(--lh-88)",
        96: "var(--lh-96)",
        112: "var(--lh-112)",
        120: "var(--lh-120)",
      },

      tracking: {
        five: "var(--tracking-05)",
        three: "var(--tracking-03)",
      },
      container: {
        center: true,
        padding: "1rem",
      },

      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
        inter: ["var(--font-inter)", ...fontFamily.sans],
      },

      backdropBlur: {
        large: "12px",
        huge: "80px",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

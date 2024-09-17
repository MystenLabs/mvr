import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
    darkMode: ["class"],
    content: ["./src/**/*.tsx"],
  theme: {
	colors: {
		white: 'rgb(var(--white))',
		background: 'rgb(var(--background))',
		'background-dark': 'rgb(var(--background-dark))',
		'background-secondary': 'rgb(var(--background-secondary))',
		'background-tertiary': 'rgb(var(--background-tertiary))',

		'border-classic': 'rgba(var(--border-classic))',

		negative: 'rgb(var(--negative))',
		positive: 'rgb(var(--positive))',
		'secondary-hover': 'rgba(var(--secondary-hover))',

		primary: 'rgb(var(--primary))',
		'primary-hover': 'rgb(var(--primary-hover))',
		'primary-inverted': 'rgb(var(--primary-inverted))',
		'primary-dark': 'rgb(var(--primary-dark))',

		'content-primary': 'rgb(var(--content-primary))',
		'content-secondary': 'rgb(var(--content-secondary))',
		'content-tertiary': 'rgb(var(--content-tertiary))',
	},
  	extend: {
		fontSize: {
			'2xs': '11px',
			xs: '12px',
			sm: '14px',
			md: '16px',
			lg: '17px',
			'DSmall': '44px',
			'HSmall': '20px',
			
		},
		spacing: {
			XSmall: 'var(--spacing-XSmall)',
			Small: 'var(--spacing-Small)',
			Regular: 'var(--spacing-Regular)',
			Large: 'var(--spacing-Large)',
			XLarge: 'var(--spacing-XLarge)',
		},
		container: {
			center: true
		},
  		fontFamily: {
  			sans: ["var(--font-sans)", ...fontFamily.sans],
			mono: ["var(--font-mono)", ...fontFamily.mono],
			inter: ["var(--font-inter)", ...fontFamily.sans],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		backdropBlur: { large: '12px', huge: '80px' },
  	}
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
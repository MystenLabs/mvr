import { Theme } from "@mysten/dapp-kit";

export const mvrWalletTheme: Theme = {
    blurs: {
          modalOverlay: 'blur(3px)',
      },
      backgroundColors: {
          primaryButton: 'white',
          primaryButtonHover: 'white',
          outlineButtonHover: 'white',
          modalOverlay: 'rgba(240, 240, 240, 5%)',
          modalPrimary: 'rgba(1, 7, 14, 1)',
          modalSecondary: 'rgba(3, 15, 28, 1)',
          iconButton: 'transparent',
          iconButtonHover: 'rgba(77, 162, 255, 0.16)',
          dropdownMenu: '#FFFFFF',
          dropdownMenuSeparator: '#F3F6F8',
          walletItemSelected: 'white',
          walletItemHover: 'rgba(77, 162, 255, 0.16)',
      },
      borderColors: {
          outlineButton: '#E4E4E7',
      },
      colors: {
          primaryButton: 'white',
          outlineButton: '#373737',
          iconButton: '#000000',
          body: 'rgba(247, 247, 248, 1)',
          bodyMuted: 'rgba(171, 189, 204, 1)',
          bodyDanger: '#FF794B',
      },
      radii: {
          small: '6px',
          medium: '8px',
          large: '12px',
          xlarge: '16px',
      },
      shadows: {
          primaryButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          walletItemSelected: '0px 2px 6px rgba(0, 0, 0, 0.05)',
      },
      fontWeights: {
          normal: '400',
          medium: '500',
          bold: '600',
      },
      fontSizes: {
          small: '14px',
          medium: '16px',
          large: '18px',
          xlarge: '20px',
      },
      typography: {
          fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          fontStyle: 'normal',
          lineHeight: '1.3',
          letterSpacing: '1',
      },
  }
  
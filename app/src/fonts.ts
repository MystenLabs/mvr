import localFont from 'next/font/local';
import { Inter } from 'next/font/google';

export const everett = localFont({
    src: [
        { path: './assets/fonts/TWKEverett-Regular.woff2', weight: '400', style: 'normal' },
        { path: './assets/fonts/TWKEverett-Medium.woff2', weight: '500', style: 'normal' },
        { path: './assets/fonts/TWKEverett-Bold.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-sans',
    style: 'normal',
    weight: '400',
});

export const everettMono = localFont({
    src: [
        { path: './assets/fonts/TWKEverettMono-Regular.woff2', weight: '400', style: 'normal' },
        { path: './assets/fonts/TWKEverettMono-Medium.woff2', weight: '500', style: 'normal' },
        { path: './assets/fonts/TWKEverettMono-Bold.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-mono',
    style: 'normal',
    weight: '400',
});

export const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    style: 'normal',
    weight: ['400', '500', '600', '700'],
});

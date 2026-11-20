import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pixelify = localFont({
  src: "./fonts/pixelify-sans.ttf",
  weight: "400 700",
  variable: "--font-pixelify",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "The Click",
  description: "Start a new game or resume your saved progress in The Click.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixelify.variable}>
      <body className={pixelify.className}>{children}</body>
    </html>
  );
}

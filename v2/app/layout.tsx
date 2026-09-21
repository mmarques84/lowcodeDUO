import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AvisoProvider } from "@/components/aviso/AvisoProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "lowcodeDUO",
  description: "Painel low-code com relatórios e dashboards ajustados por IA.",
  icons: { icon: "/brand-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AvisoProvider>{children}</AvisoProvider>
      </body>
    </html>
  );
}

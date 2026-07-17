import type { Metadata } from "next";
import { Outfit, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import Navigation from "@/components/Navigation";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Monad PoP — Monad Proof of Purchase",
  description: "Merchant-issued, blockchain-verifiable digital receipt credentials on Monad Testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        {/* Material Symbols Outlined stylesheet for layout pages */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <Web3Provider>
          {/* Testnet Banner */}
          <div className="w-full bg-gradient-to-r from-monad-darkPurple via-monad-purple to-monad-lightPurple text-white py-1.5 px-4 text-center text-xs font-semibold tracking-wider flex items-center justify-center gap-2 border-b border-monad-purple/30 shadow-md">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
            MONAD POP HACKATHON MVP — RUNNING ON MONAD TESTNET (CHAIN 10143)
          </div>
          
          <Navigation />
          
          <main className="flex-1 flex flex-col">
            {children}
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-card-border bg-card py-6 px-8 text-center text-xs text-foreground/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              &copy; {new Date().getFullYear()} Monad PoP. Built for the Monad Ecosystem.
            </div>
            <div className="flex items-center gap-4">
              <a href="https://testnet.monadvision.com" target="_blank" rel="noopener noreferrer" className="hover:text-monad-lightPurple transition">MonadVision</a>
              <span>&bull;</span>
              <a href="https://testnet.monadscan.com" target="_blank" rel="noopener noreferrer" className="hover:text-monad-lightPurple transition">Monadscan</a>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}

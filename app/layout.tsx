import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { PusherProvider } from "@/components/layout/PusherProvider";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dino Gifter',
  description: 'Manage and gift your Age of Dino dinosaurs',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthGuard>
          <PusherProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </PusherProvider>
        </AuthGuard>
      </body>
    </html>
  );
}

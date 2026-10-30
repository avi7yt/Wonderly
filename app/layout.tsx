import type { Metadata } from "next";
import "./globals.css";
import "lenis/dist/lenis.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SmoothScroll from "@/components/smoothScroll";

export const metadata: Metadata = {
  title: "Wanderly | Travel Website",
  description: "Discover and book your next trip",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">
        <SmoothScroll />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

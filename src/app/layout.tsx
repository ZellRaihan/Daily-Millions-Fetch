import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Daily Million Results",
  description: "Check the latest Daily Million lottery results and history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <header>
          <div className="container">
            <h1>Daily Million Results</h1>
            <nav>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/results">Latest Results</Link></li>
                <li><Link href="/history">Results History</Link></li>
              </ul>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">
            {children}
          </div>
        </main>
        <footer>
          <div className="container">
            <p>&copy; {new Date().getFullYear()} Daily Million Results. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

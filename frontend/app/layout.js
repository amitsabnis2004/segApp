import "./globals.css";

import Link from "next/link";

export const metadata = {
  title: "Nanoflake Thickness Lab",
  description: "Material-aware thickness estimation from optical microscope images",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="top-nav">
          <Link href="/">Home</Link>
          <Link href="/analyze">Analyze</Link>
          <Link href="/mappings">Mappings + Model</Link>
          <Link href="/dataset-tools">Dataset Tools</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}

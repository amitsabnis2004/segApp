import "./globals.css";

export const metadata = {
  title: "Nanoflake Thickness Lab",
  description: "Material-aware thickness estimation from optical microscope images",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import "plyr/dist/plyr.css";
import "./globals.css";

export const metadata = {
  title: "Snyder",
  description: "Minimal YouTube style app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

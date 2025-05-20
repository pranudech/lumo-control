import { Noto_Sans_Thai, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
});

export const metadata = {
  title: "PUMO Control",
  description: "Control interface for PUMO device",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${notoSansThai.variable} ${notoSansMono.variable} antialiased h-full bg-gradient-to-br from-gray-50 to-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}

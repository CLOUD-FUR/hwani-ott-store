import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "화니 OTT - 프리미엄 OTT 계정을 합리적인 가격으로",
  description: "Netflix, Disney+, Wavve 등 다양한 OTT 서비스를 저렴하게 이용하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'GMarketSans';
              src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansLight.woff') format('woff');
              font-weight: 300;
              font-display: swap;
            }

            @font-face {
              font-family: 'GMarketSans';
              src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
              font-weight: 500;
              font-display: swap;
            }

            @font-face {
              font-family: 'GMarketSans';
              src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
              font-weight: 700;
              font-display: swap;
            }
          `
        }} />
      </head>
      <body className="font-gmarket antialiased">
        {children}
      </body>
    </html>
  );
}

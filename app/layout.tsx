import type { Metadata, Viewport } from "next";
import "./globals.css";
import ContactWidget from "./components/ContactWidget";

export const metadata: Metadata = {
  title: {
    default: "화니 OTT - 프리미엄 OTT 계정을 합리적인 가격으로",
    template: "%s | 화니 OTT",
  },
  description: "Netflix, Disney+, Wavve 등 다양한 OTT 서비스를 저렴하게 이용하세요",
  applicationName: "화니 OTT",
  icons: {
    icon: [{ url: "/OTT.png", type: "image/png" }],
    apple: [{ url: "/OTT.png", type: "image/png" }],
    shortcut: ["/OTT.png"],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "화니 OTT",
    title: "화니 OTT - 프리미엄 OTT 계정을 합리적인 가격으로",
    description: "Netflix, Disney+, Wavve 등 다양한 OTT 서비스를 저렴하게 이용하세요",
    images: [{ url: "/OTT.png", width: 1080, height: 1080, alt: "화니 OTT" }],
  },
  twitter: {
    card: "summary",
    title: "화니 OTT - 프리미엄 OTT 계정을 합리적인 가격으로",
    description: "Netflix, Disney+, Wavve 등 다양한 OTT 서비스를 저렴하게 이용하세요",
    images: ["/OTT.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0F172A",
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

            /* 긴 한글 단어가 한 글자씩 세로로 쪼개지는 현상 방지 */
            body {
              word-break: keep-all;
              overflow-wrap: break-word;
              -webkit-text-size-adjust: 100%;
            }

            /* 모바일에서 버튼/링크 텍스트가 세로로 깨지지 않도록 */
            button, a {
              word-break: keep-all;
            }
          `
        }} />
      </head>
      <body className="font-gmarket antialiased">
        {children}
        <ContactWidget />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorBanner } from "@/components/global-error-banner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DFile Asset Management",
  description: "Advanced asset management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
      >
        {/* Remove redundant chunk CSS preloads (inlineCss + flight hints) before Chrome warns. */}
        <Script id="dfile-strip-css-preload" strategy="beforeInteractive">
          {`(function(){
function strip(){
  var h=document.head;
  if(!h)return;
  h.querySelectorAll('link[rel="preload"][as="style"]').forEach(function(el){
    var u=el.getAttribute("href")||"";
    if(u.indexOf("/_next/static/chunks/")!==-1 && /\.css($|\\?)/.test(u)) el.remove();
  });
}
strip();
if(typeof MutationObserver!=="undefined"&&document.documentElement){
  new MutationObserver(strip).observe(document.documentElement,{childList:true,subtree:true});
}
})();`}
        </Script>
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <GlobalErrorBanner />
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

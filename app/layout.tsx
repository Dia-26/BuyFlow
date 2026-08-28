import "./globals.css";import type { Metadata } from "next";
export const metadata:Metadata={title:"BuyFlow | Controlled AI Commerce",description:"Agent-readable historical catalog with bounded payment actions."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

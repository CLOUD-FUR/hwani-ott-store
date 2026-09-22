import type { Metadata } from "next";
import AdminShell from "./components/AdminShell";

export const metadata: Metadata = {
  title: "화니 OTT 관리자",
  description: "화니 OTT 관리자 콘솔",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

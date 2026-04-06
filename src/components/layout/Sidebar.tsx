"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  Building2,
  BarChart3,
  Landmark,
  Calculator,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { CompanySwitcher } from "./CompanySwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Översikt", icon: <LayoutDashboard size={18} /> },
  { href: "/invoices", label: "Fakturor", icon: <FileText size={18} /> },
  { href: "/customers", label: "Kunder", icon: <Users size={18} /> },
  { href: "/expenses", label: "Utgifter", icon: <Receipt size={18} /> },
  { href: "/bank", label: "Bank", icon: <Landmark size={18} /> },
  { href: "/reports", label: "Rapporter", icon: <BarChart3 size={18} /> },
  { href: "/tax", label: "Skatt", icon: <Calculator size={18} /> },
  { href: "/companies", label: "Företag", icon: <Building2 size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">Bokföring</h1>
        <p className="text-xs text-gray-400 mt-0.5">Svensk redovisning</p>
      </div>

      {/* Company Switcher */}
      <div className="px-4 py-3 border-b border-gray-700">
        <CompanySwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-4 border-t border-gray-700 space-y-1">
        <Link
          href="/companies"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}
        >
          <Settings size={18} />
          Inställningar
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logga ut
        </button>
      </div>
    </div>
  );
}

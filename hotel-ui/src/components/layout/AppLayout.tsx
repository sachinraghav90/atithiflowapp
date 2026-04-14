import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);

    const sidebarWidth = collapsed ? "w-16" : "w-56";
    const mainMargin = collapsed ? "lg:ml-16" : "lg:ml-56";

    return (
        <div className="h-screen bg-background overflow-hidden">
            <AppHeader
                collapsed={collapsed}
                setCollapsed={setCollapsed}
            />

            {/* Sidebar */}
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content */}
            <main
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    "h-[calc(100vh-3.5rem)]",
                    mainMargin
                )}
            >
                <Outlet />
            </main>
        </div>
    );
}

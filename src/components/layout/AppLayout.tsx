import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import EmptyPropertyOnboarding from "@/components/layout/EmptyPropertyOnboarding";
import { LogoSpinner } from "@/components/Spinner";

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);

    const sidebarWidth = collapsed ? "w-16" : "w-56";
    const mainMargin = collapsed ? "lg:ml-16" : "lg:ml-56";

    const { pathname } = useLocation();
    
    // Check if the user is a multi-property user (Super Admin / Owner)
    const { isLoading } = useAutoPropertySelect(null, () => {});

    const renderMainContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center h-full w-full"><LogoSpinner /></div>;
        }

        return <Outlet />;
    };

    return (
        <div className="h-screen bg-background overflow-hidden">
            <Helmet>
                <title>AtithiFlow</title>
            </Helmet>
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
                    "h-[calc(100vh-3.5rem)] overflow-y-auto app-scrollbar",
                    mainMargin
                )}
            >
                {renderMainContent()}
            </main>
        </div>
    );
}

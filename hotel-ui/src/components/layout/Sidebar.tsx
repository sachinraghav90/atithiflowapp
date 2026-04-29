import React, { useEffect, useState } from 'react'
import { Menu, ChevronRight, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '../ui/button';
import { cn } from "@/lib/utils";
import { useLazyGetSidebarLinksQuery } from '@/redux/services/hmsApi';
import { useAppSelector } from '@/redux/hook';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { SIDEBAR_ICON_MAP } from "./sidebarIconMap";
import { hmsApi } from '@/redux/services/hmsApi';
import { useAutoPropertySelect } from '@/hooks/useAutoPropertySelect';
import { px, rgba } from 'framer-motion';

export default function Sidebar({
    collapsed,
    setCollapsed,
}: {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
}) {
    const [sidebar, { data, isLoading, isError, isUninitialized }] = useLazyGetSidebarLinksQuery()
    const [propertyId, setPropertyId] = useState<number | undefined>();

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const meLoaded = useAppSelector(state => state.isLoggedIn.meLoaded)
    const { pathname } = useLocation()

    // Get the current selected property to provide to prefetch hooks
    useAutoPropertySelect(propertyId, setPropertyId);

    useEffect(() => {
        if (!isLoggedIn || !meLoaded) return
        sidebar(undefined)
    }, [isLoggedIn, meLoaded, sidebar])


    return (
        <aside
            className={cn(
                "relative hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col",
                "bg-gradient-to-b from-background via-background to-muted/40",
                "border-r border-slate-900/60",
                "transition-all duration-300 ease-in-out",
                collapsed ? "w-16" : "w-56"
            )}
            style={{ boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.1)" }}
        >
            <div className="h-14 flex items-center justify-center border-b border-slate-900/60 cursor-pointer">
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                {!isLoading &&
                    data?.sidebarLinks.map((link: any) => (
                        <SidebarLink
                            key={link.sidebar_link_id}
                            endpoint={link.endpoint}
                            label={link.link_name}
                            icon={SIDEBAR_ICON_MAP[link.endpoint] ?? ChevronRight}
                            collapsed={collapsed}
                            active={pathname === link.endpoint}
                            propertyId={propertyId}
                        />
                    ))}
            </nav>
        </aside>
    )
}

function SidebarLink({
    label,
    active = false,
    endpoint,
    collapsed,
    icon: Icon,
    propertyId
}: any) {
    const navigate = useNavigate();
    const prefetch = hmsApi.usePrefetch as any;

    // Prefetch hooks
    const prefetchBookings = prefetch("getBookings");
    const prefetchOrders = prefetch("getPropertyOrders");
    const prefetchEnquiries = prefetch("getPropertyEnquiries");
    const prefetchInventory = prefetch("getInventory");

    const handleMouseEnter = () => {
        // SAFETY: Only prefetch if we have a valid numeric propertyId
        if (!propertyId || isNaN(Number(propertyId))) return;

        if (endpoint === "/bookings") {
            prefetchBookings({ 
                propertyId, 
                page: 1, 
                scope: "upcoming", 
                status: "CONFIRMED",
                limit: 10
            });
        }
        if (endpoint === "/orders") {
            prefetchOrders({ propertyId, page: 1 });
        }
        if (endpoint === "/enquiries") {
            prefetchEnquiries({ propertyId, page: 1 });
        }
        if (endpoint === "/inventory") {
            prefetchInventory({ propertyId, page: 1 });
        }
    };

    const button = (
        <button
            onClick={() => navigate(endpoint)}
            onMouseEnter={handleMouseEnter}
            className={cn(
                "group w-full flex items-center gap-3 rounded-md",
                "transition-all duration-200",
                "h-10",
                collapsed ? "px-2 justify-center" : "px-3",
                active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10 text-foreground"
            )}
        >
            <div className="h-8 w-8 flex items-center justify-center rounded-md">
                <Icon
                    className={cn(
                        "h-4 w-4",
                        active ? "text-primary-foreground" : "text-primary"
                    )}
                />
            </div>

            {!collapsed && (
                <span className="text-sm font-medium truncate">
                    {label}
                </span>
            )}
        </button>
    );

    if (collapsed) {
        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {button}
                    </TooltipTrigger>
                    <TooltipContent
                        side="right"
                        className="text-xs font-medium"
                        sideOffset={8}
                    >
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return button;
}

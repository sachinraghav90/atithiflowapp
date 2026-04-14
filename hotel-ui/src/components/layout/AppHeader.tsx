import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { useGetMeQuery, useGetPropertyAddressByUserQuery } from "@/redux/services/hmsApi";
import { logout } from "@/redux/slices/isLoggedInSlice";
import { AlignJustify, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";

type Props = {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
};

export default function AppHeader({ collapsed, setCollapsed }: Props) {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const { data, isLoading: meLoading } = useGetMeQuery()
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: propertyAddress } = useGetPropertyAddressByUserQuery(undefined, {
        skip: !isLoggedIn || isOwner || isSuperAdmin || meLoading
    });

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const initials =
        data?.user?.staff?.first_name?.[0]?.toUpperCase() ?? "U";

    function handleLogout() {
        localStorage.clear();
        dispatch(logout());
        navigate("/login");
    }

    return (
        <header className="
                    sticky top-0 z-50 h-14
                    border-b border-border bg-background
                    px-4 lg:px-6
                    grid grid-cols-[auto_1fr_auto]
                    items-center
                    ">
            {/* ================= LEFT ================= */}
            <div className="flex items-center gap-3">
                {/* Collapse button */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCollapsed(!collapsed)}
                    className="h-8 w-8"
                >
                    {/* {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )} */}
                    <AlignJustify className="h-4 w-4" />
                </Button>

                {/* Logo */}
                <img
                    src={atithiflowLogo}
                    alt="AtithiFlow"
                    className="h-8 w-auto cursor-pointer"
                    onClick={() => navigate("/dashboard")}
                />
            </div>

            {/* ================= CENTER ================= */}
            <div className="flex flex-col items-center justify-center text-center truncate">
                {propertyAddress && (
                    <>
                        <span className="text-sm font-semibold text-foreground truncate">
                            {propertyAddress.brand_name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[420px]">
                            {propertyAddress?.address_line_1}, {propertyAddress.city}, {propertyAddress.state}, {propertyAddress?.postal_code}
                        </span>
                    </>
                )}
            </div>

            {/* ================= RIGHT ================= */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none">
                        <div className="hidden sm:flex flex-col items-end leading-tight text-right">
                            <span className="text-sm font-medium truncate max-w-[140px]">
                                {data?.user?.staff?.first_name ?? "User"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {data?.user?.email ?? ""}
                            </span>
                        </div>

                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}

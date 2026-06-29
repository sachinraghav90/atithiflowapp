import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { useState } from "react";
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
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import ViewField from "@/components/ViewField";
import CardSectionView from "@/components/CardSectionView";
import { GridBadge } from "@/components/ui/grid-badge";
import { Badge } from "@/components/ui/badge";
import { useUpdateMyPasswordMutation } from "@/redux/services/hmsApi";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

type Props = {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
};

export default function AppHeader({ collapsed, setCollapsed }: Props) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false);

    const [updatePassword, { isLoading: isUpdatingPassword }] = useUpdateMyPasswordMutation();

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmitPassword = async (values: PasswordFormValues) => {
        try {
            await updatePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            }).unwrap();
            
            toast.success("Password updated successfully");
            setIsPasswordSheetOpen(false);
            passwordForm.reset();
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to update password");
        }
    };
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const { data, isLoading: meLoading } = useGetMeQuery(undefined, {
        skip: !isLoggedIn
    })
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    // Check for zero properties
    const [dummyPropertyId, setDummyPropertyId] = useState<number | null>(null);
    const { myProperties, isMultiProperty } = useAutoPropertySelect(dummyPropertyId, setDummyPropertyId);
    const hasZeroProperties = isMultiProperty && myProperties?.properties && myProperties.properties.length === 0;

    const { data: propertyAddress } = useGetPropertyAddressByUserQuery(undefined, {
        skip: !isLoggedIn || isOwner || isSuperAdmin || meLoading || hasZeroProperties
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
                    border-b border-gray-500 bg-background
                    px-4 lg:px-6
                    grid grid-cols-[auto_1fr_auto]
                    items-center
                    " style={{boxShadow:"0 2px 4px 0 rgba(0, 0, 0, 0.1)"}}>     
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
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
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

            {/* Profile Side Sheet */}
            <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <SheetContent className="flex flex-col sm:max-w-2xl w-full overflow-y-auto">
                    <SheetHeader className="border-b pb-2 pr-8 flex flex-row items-center justify-between space-y-0">
                        <SheetTitle>Profile</SheetTitle>
                        <Button className="mr-4" onClick={() => setIsPasswordSheetOpen(true)}>Update Password</Button>
                    </SheetHeader>

                    <div className="flex-1  pb-2 space-y-6">
                        <CardSectionView 
                            title="User Information"
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <ViewField 
                                label="Name" 
                                value={`${data?.user?.staff?.first_name || ""} ${data?.user?.staff?.last_name || ""}`.trim() || "--"} 
                            />
                            <ViewField 
                                label="Email" 
                                value={data?.user?.email || "--"} 
                            />
                            <ViewField 
                                label="Phone" 
                                value={data?.user?.staff?.phone1 || data?.user?.staff?.phone || "--"} 
                            />
                            {data?.user?.staff?.gender && (
                                <ViewField 
                                    label="Gender" 
                                    value={data.user.staff.gender} 
                                />
                            )}
                            {data?.user?.staff?.blood_group && (
                                <ViewField 
                                    label="Blood Group" 
                                    value={data.user.staff.blood_group} 
                                />
                            )}
                            {data?.user?.staff?.nationality && (
                                <ViewField 
                                    label="Nationality" 
                                    value={data.user.staff.nationality} 
                                />
                            )}
                            <ViewField 
                                label="Role" 
                                value={data?.user?.roles?.map((r: any) => r.name.toUpperCase()).join(", ") || "--"} 
                            />
                            {data?.user?.staff?.status && (
                                <ViewField 
                                    label="Status" 
                                    value={<GridBadge status={data.user.staff.status} statusType="staff">{data.user.staff.status}</GridBadge>} 
                                />
                            )}
                            <div className="sm:col-span-2">
                                <ViewField 
                                    label="Assigned Properties" 
                                    value={
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {isMultiProperty ? (
                                                myProperties?.properties?.length ? myProperties.properties.map((p: any) => (
                                                    <Badge key={p.id} variant="outline" className="font-normal">{p.brand_name}</Badge>
                                                )) : "--"
                                            ) : (
                                                propertyAddress?.brand_name ? (
                                                    <Badge variant="outline" className="font-normal">{propertyAddress.brand_name}</Badge>
                                                ) : "--"
                                            )}
                                        </div>
                                    } 
                                />
                            </div>
                        </CardSectionView>
                    </div>

                    <SheetFooter className="border-t pt-4 mt-auto">
                        <SheetClose asChild>
                            <Button variant="default">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Update Password Side Sheet */}
            <Sheet open={isPasswordSheetOpen} onOpenChange={(open) => {
                setIsPasswordSheetOpen(open);
                if (!open) passwordForm.reset();
            }}>
                <SheetContent className="flex flex-col sm:max-w-md w-full overflow-y-auto">
                    <SheetHeader className="border-b pb-4">
                        <SheetTitle>Change Password</SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 pt-6 pb-6">
                        <Form {...passwordForm}>
                            <form id="password-form" onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter current password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter new password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Confirm new password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </div>

                    <SheetFooter className="border-t pt-4 mt-auto">
                        <SheetClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </SheetClose>
                        <Button type="submit" form="password-form" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? "Updating..." : "Update"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </header>
    );
}

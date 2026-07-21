import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/index";
import Platform from "./pages/platform";
import Contact from "./pages/contact";
import Login from "./pages/login";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsOfService from "./pages/terms-of-service";
import NotFound from "./pages/not-found";
import Reservation from "./pages/reservation";
import { supabase } from "../supabase/functions/supabase-client.ts";
import { useEffect, useState, Suspense, lazy } from "react";
const RoleManagement = lazy(() => import("./pages/role-management"));
import { ToastContainer } from 'react-toastify';
const PropertyManagement = lazy(() => import("./pages/property-management"));
import { LogoSpinner } from "./components/spinner";
const StaffManagement = lazy(() => import("./pages/staff-management"));
import { useAuthBootstrap } from "./hooks/use-auth-bootstrap";
const RoomsByFloor = lazy(() => import("./pages/rooms-by-floor"));
const PackageManagement = lazy(() => import("./pages/package-management"));
const BookingsManagement = lazy(() => import("./pages/booking-management"));
// const GuestsCreationManagement = lazy(() => import("./pages/GuestsCreationManagement.tsx"));
// const GuestsManagement = lazy(() => import("./pages/GuestManagement.tsx"));
const PaymentsManagement = lazy(() => import("./pages/payment-management"));
const RoomTypeBasePriceManagement = lazy(() => import("./pages/room-type-base-price-management"));
import { useAutoLogout } from "./hooks/use-auto-logout";
import { useAppDispatch, useAppSelector } from "./redux/hook.ts";
import { setApiLoaded } from "./redux/slices/is-logged-in-slice";
const RoomStatusBoard = lazy(() => import("./pages/room-status-board"));
const VendorsManagement = lazy(() => import("./pages/vendors-management"));
const LaundryPricingManagement = lazy(() => import("./pages/laundry-pricing-management"));
const LaundryOrdersManagement = lazy(() => import("./pages/laundry-orders-management"));
const CreateEnquiry = lazy(() => import("./pages/enquiry-create"));
const EnquiriesManagement = lazy(() => import("./pages/enquiries-management"));
const MenuMaster = lazy(() => import("./pages/menu-master"));
const OrdersManagement = lazy(() => import("./pages/order-management").then(module => ({ default: module.OrdersManagement })));
const CreateOrder = lazy(() => import("./pages/create-order").then(module => ({ default: module.CreateOrder })));
const RestaurantTables = lazy(() => import("./pages/restaurant-table").then(module => ({ default: module.RestaurantTables })));
const KitchenInventory = lazy(() => import("./pages/kitchen-inventory"));
import { useGetSidebarLinksQuery } from "./redux/services/hms-api";
const UnauthorizedAccessPage = lazy(() => import("./pages/unauthorized-access-page"));
import AppLayout from "./components/layout/app-layout";
const InventoryMaster = lazy(() => import("./pages/inventory-master"));
// const GuestsCreationManagement = lazy(() => import("./pages/GuestsCreationManagement.tsx"));

const queryClient = new QueryClient();

const unsafePaths = ["/", "/platform", "/contact", "/privacy-policy", "/terms-of-service", "/guests", "/unauthorized-access"];
const loggedInPaths = ["/reservation", "/create-enquiry", "/create-order"];

const App = () => {
  const [accessiblePaths, setAccessiblePaths] = useState([]);

  useAuthBootstrap();
  useAutoLogout();
  const isLoggedIn = useAppSelector((state) => state.isLoggedIn.value);
  const meLoaded = useAppSelector((state) => state.isLoggedIn.meLoaded);
  const apiLoaded = useAppSelector((state) => state.isLoggedIn.apiLoaded);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const pathname = useLocation().pathname;

  const { data: sidebarLinks } = useGetSidebarLinksQuery(undefined, {
    skip: !isLoggedIn || !meLoaded,
  });

  useEffect(() => {
    if (!isLoggedIn || !sidebarLinks?.sidebarLinks) return;

    const accessible = sidebarLinks.sidebarLinks.map(d => d.endpoint);

    setAccessiblePaths([...new Set([...accessible, ...unsafePaths, ...loggedInPaths])]);
  }, [sidebarLinks, isLoggedIn]);

  useEffect(() => {
    if (!apiLoaded) return;

    if (!isLoggedIn) {
      if (!unsafePaths.includes(pathname)) {
        navigate("/login", { replace: true });
      }
    }

    dispatch(setApiLoaded(false));
  }, [apiLoaded, isLoggedIn, pathname, navigate, dispatch]);

  useEffect(() => {
    if (apiLoaded && !isLoggedIn) {
      if (!unsafePaths.includes(pathname)) {
        navigate("/login", { replace: true })
      }
      // dispatch(setApiLoaded(false))
    } else if (apiLoaded && isLoggedIn && pathname === "/login") {
      if (sidebarLinks?.sidebarLinks?.length) {
        const redirectPath = sidebarLinks.sidebarLinks[0].endpoint || "/AtithiFlow";
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isLoggedIn, apiLoaded, pathname, navigate, sidebarLinks])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer style={{ pointerEvents: 'auto', zIndex: 99999 }} />
      <TooltipProvider delayDuration={100}>
        <Toaster />
        <Sonner />
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background"><LogoSpinner /></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            <Route element={<AppLayout />}>
              <Route path="/reservation" element={<Reservation />} />
              <Route path="/roles" element={<RoleManagement />} />
              <Route path="/properties" element={<PropertyManagement />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/rooms" element={<RoomsByFloor />} />
              <Route path="/plans" element={<PackageManagement />} />
              <Route path="/bookings" element={<BookingsManagement />} />
              <Route path="/payments" element={<PaymentsManagement />} />
              <Route path="/room-categories" element={<RoomTypeBasePriceManagement />} />
              <Route path="/room-status" element={<RoomStatusBoard />} />
              <Route path="/vendors" element={<VendorsManagement />} />
              <Route path="/laundry-pricing" element={<LaundryPricingManagement />} />
              <Route path="/laundry-orders" element={<LaundryOrdersManagement />} />
              <Route path="/create-enquiry" element={<CreateEnquiry />} />
              <Route path="/enquiries" element={<EnquiriesManagement />} />
              <Route path="/menu-items" element={<MenuMaster />} />
              <Route path="/orders" element={<OrdersManagement />} />
              <Route path="/create-order" element={<CreateOrder />} />
              <Route path="/restaurant-tables" element={<RestaurantTables />} />
              <Route path="/kitchen-inventory" element={<KitchenInventory />} />
              <Route path="/inventory-master" element={<InventoryMaster />} />
              {/* <Route path="/guests" element={<GuestsCreationManagement />} /> */}
            </Route>
            <Route path="/unauthorized-access" element={<UnauthorizedAccessPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  )
};

export default App;

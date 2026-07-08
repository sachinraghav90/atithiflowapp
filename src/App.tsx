import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Platform from "./pages/Platform";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import Reservation from "./pages/Reservation";
import { supabase } from "../supabase/functions/supabase-client.ts";
import { useEffect, useState, Suspense, lazy } from "react";
const RoleManagement = lazy(() => import("./pages/RoleManagement.tsx"));
import { ToastContainer } from 'react-toastify';
const PropertyManagement = lazy(() => import("./pages/PropertyManagement.tsx"));
import { LogoSpinner } from "./components/Spinner.tsx";
const StaffManagement = lazy(() => import("./pages/StaffManagment.tsx"));
import { useAuthBootstrap } from "./hooks/useAuthBootstrap.ts";
const RoomsByFloor = lazy(() => import("./pages/RoomsByFloor.tsx"));
const PackageManagement = lazy(() => import("./pages/PackageManagement.tsx"));
const BookingsManagement = lazy(() => import("./pages/BookingManagement.tsx"));
// const GuestsCreationManagement = lazy(() => import("./pages/GuestsCreationManagement.tsx"));
// const GuestsManagement = lazy(() => import("./pages/GuestManagement.tsx"));
const PaymentsManagement = lazy(() => import("./pages/PaymentManagement.tsx"));
const RoomTypeBasePriceManagement = lazy(() => import("./pages/RoomTypeBasePriceManagement.tsx"));
import { useAutoLogout } from "./hooks/useAutoLogout.ts";
import { useAppDispatch, useAppSelector } from "./redux/hook.ts";
import { setApiLoaded } from "./redux/slices/isLoggedInSlice.ts";
const RoomStatusBoard = lazy(() => import("./pages/RoomStatusBoard.tsx"));
const VendorsManagement = lazy(() => import("./pages/VendorsManagement.tsx"));
const LaundryPricingManagement = lazy(() => import("./pages/LaundryPricingManagement.tsx"));
const LaundryOrdersManagement = lazy(() => import("./pages/LaundryOrdersManagement.tsx"));
const CreateEnquiry = lazy(() => import("./pages/EnquiryCreate.tsx"));
const EnquiriesManagement = lazy(() => import("./pages/EnquiriesManagement.tsx"));
const MenuMaster = lazy(() => import("./pages/MenuMaster.tsx"));
const OrdersManagement = lazy(() => import("./pages/OrderManagement.tsx").then(module => ({ default: module.OrdersManagement })));
const CreateOrder = lazy(() => import("./pages/CreateOrder.tsx").then(module => ({ default: module.CreateOrder })));
const RestaurantTables = lazy(() => import("./pages/RestaurantTable.tsx").then(module => ({ default: module.RestaurantTables })));
const KitchenInventory = lazy(() => import("./pages/KitchenInventory.tsx"));
import { useGetSidebarLinksQuery } from "./redux/services/hmsApi.ts";
const UnauthorizedAccessPage = lazy(() => import("./pages/UnauthorizedAccessPage.tsx"));
import AppLayout from "./components/layout/AppLayout.tsx";
const InventoryMaster = lazy(() => import("./pages/InventoryMaster.tsx"));
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

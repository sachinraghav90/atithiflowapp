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
import { useEffect, useState } from "react";
import RoleManagement from "./pages/RoleManagement.tsx";
import { ToastContainer } from 'react-toastify';
import PropertyManagement from "./pages/PropertyManagement.tsx";
import { LogoSpinner } from "./components/Spinner.tsx";
import StaffManagement from "./pages/StaffManagment.tsx";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap.ts";
import RoomsByFloor from "./pages/RoomsByFloor.tsx";
import PackageManagement from "./pages/PackageManagement.tsx";
import BookingsManagement from "./pages/BookingManagement.tsx";
// import GuestsCreationManagement from "./pages/GuestsCreationManagement.tsx";
// import GuestsManagement from "./pages/GuestManagement.tsx";
import PaymentsManagement from "./pages/PaymentManagement.tsx";
import RoomTypeBasePriceManagement from "./pages/RoomTypeBasePriceManagement.tsx";
import { useAutoLogout } from "./hooks/useAutoLogout.ts";
import { useAppDispatch, useAppSelector } from "./redux/hook.ts";
import { setApiLoaded } from "./redux/slices/isLoggedInSlice.ts";
import RoomStatusBoard from "./pages/RoomStatusBoard.tsx";
import VendorsManagement from "./pages/VendorsManagement.tsx";
import LaundryPricingManagement from "./pages/LaundryPricingManagement.tsx";
import LaundryOrdersManagement from "./pages/LaundryOrdersManagement.tsx";
import CreateEnquiry from "./pages/EnquiryCreate.tsx";
import EnquiriesManagement from "./pages/EnquiriesManagement.tsx";
import MenuMaster from "./pages/MenuMaster.tsx";
import { OrdersManagement } from "./pages/OrderManagement.tsx";
import { CreateOrder } from "./pages/CreateOrder.tsx";
import { RestaurantTables } from "./pages/RestaurantTable.tsx";
import KitchenInventory from "./pages/KitchenInventory.tsx";
import { useGetSidebarLinksQuery } from "./redux/services/hmsApi.ts";
import UnauthorizedAccessPage from "./pages/UnauthorizedAccessPage.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import InventoryMaster from "./pages/InventoryMaster.tsx";
import GuestsCreationManagement from "./pages/GuestsCreationManagement.tsx";

const queryClient = new QueryClient();

const App = () => {

  const [accessiblePaths, setAccessiblePaths] = useState([])

  useAuthBootstrap()
  useAutoLogout()
  const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
  const meLoaded = useAppSelector(state => state.isLoggedIn.meLoaded)
  const apiLoaded = useAppSelector(state => state.isLoggedIn.apiLoaded)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const pathname = useLocation().pathname

  const { data: sidebarLinks } = useGetSidebarLinksQuery(undefined, {
    skip: !isLoggedIn || !meLoaded
  })

  const unsafePaths = ["/", "/platform", "/contact", "/privacy-policy", "/terms-of-service", "/guests", "/unauthorized-access"]
  const loggedInPaths = ["/reservation", "/create-enquiry", "/create-order"]

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
    }
  }, [isLoggedIn, apiLoaded])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <TooltipProvider delayDuration={100}>
        <Toaster />
        <Sonner />
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
      </TooltipProvider>
    </QueryClientProvider>
  )
};

export default App;

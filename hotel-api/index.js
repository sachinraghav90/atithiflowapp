import express from "express";
import { config } from "dotenv";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import userRoutes from "./src/routes/user-route.js";
import roleRoutes from "./src/routes/role-route.js";
import propertyRoutes from "./src/routes/property-route.js";
import sidebarLinkRoutes from "./src/routes/sidebar-link-route.js";
import roleSidebarLinkRoutes from "./src/routes/role-sidebar-link-route.js";
import propertyFloorRoutes from "./src/routes/property-floor-route.js";
import staffRoutes from "./src/routes/staff-route.js";
import roomRoutes from "./src/routes/room-route.js";
import packageRoutes from "./src/routes/package-route.js";
import bookingsRoutes from "./src/routes/booking-route.js";
import guestsRoutes from "./src/routes/guest-route.js";
import paymentsRoutes from "./src/routes/payment-route.js";
import acTypesRoutes from "./src/routes/ac-type-route.js";
import bedTypesRoutes from "./src/routes/bed-type-route.js";
import roomCategoriesRoutes from "./src/routes/room-category-route.js";
import roomTypeRateRoutes from "./src/routes/room-type-rate-route.js";
import refPackagesRoutes from "./src/routes/ref-package-route.js";
import propertyBanksRoutes from "./src/routes/property-bank-account-route.js";
import vendorRoutes from "./src/routes/vendor-route.js";
import laundryRoutes from "./src/routes/laundry-route.js";
import enquiryRoutes from "./src/routes/enquiry-route.js";
import menuMasterRoutes from "./src/routes/menu-master-route.js";
import restaurantOrderRoutes from "./src/routes/restaurant-order-route.js";
import restaurantTablesRoutes from "./src/routes/restaurant-table-route.js";
import kitchenInventoryRoutes from "./src/routes/kitchen-inventory-route.js";
import auditRoutes from "./src/routes/audit-route.js";
import inventoryRoutes from "./src/routes/inventory-route.js";
import menuItemGroupRoutes from "./src/routes/menu-item-group-route.js";
import deliveryPartnersRoutes from "./src/routes/delivery-partner-route.js";
import invoiceRoutes from "./src/routes/invoice-route.js";
import { normalizeRequestKeys } from "./src/middlewares/normalize-request-keys.js";

config()

const app = express();

// ==========================================
// PRODUCTION SECURITY & PERFORMANCE LAYER
// ==========================================

// 1. Configurable CORS (MUST BE FIRST)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*';

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))

// 2. HTTP Security Headers
app.use(helmet());

// 3. GZIP Payload Compression
app.use(compression());

// 4. HTTP Request Logging (Combined Apache Format)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 5. Rate Limiting (DDoS & Brute Force Protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200, // Limit each IP to 200 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use(limiter);

// ==========================================
// DATA PARSING & ROUTES
// ==========================================

app.use(express.json({ limit: "10mb" }))
app.use(normalizeRequestKeys)

app.use("/users", userRoutes)
app.use("/roles", roleRoutes)
app.use("/properties", propertyRoutes)
app.use("/sidebar-link", sidebarLinkRoutes)
app.use("/role-sidebar-link", roleSidebarLinkRoutes)
app.use("/property-floors", propertyFloorRoutes)
app.use("/staff", staffRoutes)
app.use("/rooms", roomRoutes)
app.use("/packages", packageRoutes)
app.use("/bookings", bookingsRoutes)
app.use("/guests", guestsRoutes)
app.use("/payments", paymentsRoutes)
app.use("/ac-types", acTypesRoutes)
app.use("/bed-types", bedTypesRoutes)
app.use("/room-categories", roomCategoriesRoutes)
app.use("/room-type-rates", roomTypeRateRoutes)
app.use("/ref-packages", refPackagesRoutes)
app.use("/property-banks", propertyBanksRoutes)
app.use("/vendors", vendorRoutes)
app.use("/laundries", laundryRoutes)
app.use("/enquiries", enquiryRoutes)
app.use("/menu", menuMasterRoutes)
app.use("/orders", restaurantOrderRoutes)
app.use("/tables", restaurantTablesRoutes)
app.use("/kitchen", kitchenInventoryRoutes)
app.use("/audits", auditRoutes)
app.use("/inventory", inventoryRoutes)
app.use("/menu-item-groups", menuItemGroupRoutes)
app.use("/delivery-partners", deliveryPartnersRoutes);
app.use("/invoices", invoiceRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err);

    const isDatabaseError = err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("ETIMEDOUT") ||
        err.stack?.includes("pg-pool") ||
        err.message?.includes("Supabase");

    if (isDatabaseError) {
        return res.status(503).json({
            error: "Service Unavailable",
            message: "Database connection failed. This is likely due to a Supabase service outage. Please try again later."
        });
    }

    res.status(500).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred on the server."
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on: ${process.env.PORT || "Either ENV not loaded or PORT is not defined default port is 3000"}`);
});


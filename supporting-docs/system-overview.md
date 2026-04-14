# Atithiflow System Overview

## Project Overview
Atithiflow is a hotel management system aimed at small and medium hotels. The codebase is split into two deployable applications:

- `hotel-api/`: Node.js backend exposing operational APIs, authorization checks, and business workflows.
- `hotel-ui/`: React frontend for public marketing pages, login, and authenticated hotel operations.

The current implementation uses Supabase as the platform boundary for authentication and Postgres hosting, but most domain data access is performed by the backend through raw SQL over `pg`, not through the Supabase client SDK.

## Tech Stack Summary
### Backend
- Runtime: Node.js with ES modules
- Framework: Express 5
- Database access: `pg`
- Auth/JWT: Supabase Auth tokens validated with `jsonwebtoken` + `jwks-rsa`
- Supabase SDK usage: `@supabase/supabase-js` for admin user lifecycle operations
- File upload handling: `multer`

### Frontend
- Framework: React 18 + Vite
- Language: TypeScript
- Routing: `react-router-dom`
- State management: Redux Toolkit
- API integration: RTK Query
- Additional data layer: TanStack Query is mounted globally, but domain API traffic currently goes through RTK Query
- UI stack: Tailwind CSS, shadcn/ui-style component library, Radix primitives, Framer Motion

### Supabase
- Postgres is the primary operational datastore
- Supabase Auth issues access tokens used by the UI and verified by the backend
- A small `hotel-ui/supabase/functions` area contains an edge function for reCAPTCHA verification

## Architecture Overview
### Runtime boundaries
1. The frontend logs users in directly against Supabase Auth via `supabase.auth.signInWithPassword`.
2. The UI stores the returned access token in `localStorage` under `access_token`.
3. RTK Query sends that token to `hotel-api` using the `Authorization: Bearer <token>` header.
4. The backend validates the JWT against Supabase JWKS in `utils/verifySupabaseJwt.js`.
5. `src/middlewares/supabaseAuth.js` maps the authenticated Supabase user to an internal row in `public.users` and attaches `req.user`.
6. Route-level role checks are enforced with `requireRole`.
7. Controllers delegate to services, and services execute SQL directly against Supabase Postgres through the shared `pg` pool from `utils/getDb.js`.

### Architectural pattern
- Backend: `route -> middleware -> controller -> service -> Postgres`
- Frontend: `page/component -> RTK Query hook -> backend API`
- Auth: `frontend -> Supabase Auth`, then `backend -> JWT verification + internal user lookup`

### Important implication
Supabase is not acting as the main application query layer. The backend owns business logic, data shaping, transaction boundaries, and access checks for operational data.

## Backend (Node.js) Breakdown
### Entry point and middleware
`hotel-api/index.js`:
- Creates the Express app
- Enables CORS and JSON parsing
- Applies `normalizeRequestKeys`
- Registers all route modules under resource-specific base paths

### Folder structure
- `src/routes/`: Express resource routes and middleware composition
- `src/controllers/`: HTTP adapters that parse request input and format responses
- `src/services/`: Core business logic and SQL execution
- `src/middlewares/`: auth, RBAC, upload handling, request normalization
- `src/cache/`: local cache utilities
- `utils/`: shared helpers for DB access, JWT verification, role constants, and seed-style utilities
- `migrations/`: SQL schema evolution files executed by `scripts/run-migrations.js`
- `scripts/`: migration/bootstrap/seed scripts

### Key backend infrastructure
- `utils/getDb.js`: shared `pg.Pool`
- `src/services/Supabase.service.js`: `auth.admin.createUser`, `updateUserById`, `deleteUser`
- `src/middlewares/supabaseAuth.js`: JWT validation + internal user record lookup
- `src/middlewares/requireRole.js`: route-level role gate
- `src/services/Audit.service.js`: audit trail persistence used across mutating workflows

### Coding pattern
Most services:
- Build SQL manually
- Use explicit transactions for multi-table operations
- Log operational changes into `audits`
- Return plain objects consumed by controllers

This keeps the backend explicit and debuggable, but it also means consistency depends on service discipline rather than framework conventions.

## Supabase Schema & Data Layer
### Data access model
- Primary data access path: backend `pg` queries against Postgres
- Supabase SDK usage in backend: admin auth operations only
- Supabase SDK usage in frontend: user sign-in only, plus edge function client setup

### Core schema groups
#### Identity and tenancy
- `users`: internal application user rows keyed to `auth.users.id`
- `roles`: role catalog
- `property_users`: user-to-property-to-role mapping
- `sidebar_links`: navigable modules/endpoints
- `role_sidebar_links`: per-role sidebar permissions

#### Property and configuration
- `properties`
- `addresses`
- `property_floors`
- `property_bank_accounts`
- `room_categories`
- `bed_types`
- `ac_types`
- `ref_room_types`
- `room_type_rates`
- `ref_packages`
- `packages`

#### Front desk operations
- `bookings`
- `room_details`
- `ref_rooms`
- `guests`
- `vehicles`
- `payments`
- `enquiries`
- `enquiry_room_details`
- `staff`
- `visa_details`
- `audits`

#### Restaurant and inventory
- `menu_master`
- `menu_item_groups`
- `restaurant_orders`
- `restaurant_order_items`
- `restaurant_tables`
- `inventory_types`
- `inventory_master`
- `kitchen_inventory`
- `delivery_partners`

#### Laundry
- `ref_laundry`
- `laundry`
- `laundry_orders`
- `laundry_order_items`

### Relationship highlights
- `users.id` references `auth.users(id)` with `ON DELETE CASCADE`
- `property_users` links `properties`, `users`, and `roles`
- `bookings.property_id` references `properties`
- `bookings.package_id` references `packages`
- `room_details.booking_id` references `bookings`
- `room_details.ref_room_id` references `ref_rooms`
- `guests`, `vehicles`, and `payments` all reference `bookings` and `properties`
- `restaurant_orders` can reference `booking_id`, `guest_id`, `room_id`, `waiter_staff_id`, and `delivery_partner_id`
- `laundry_order_items.order_id` references `laundry_orders`, and `laundry_id` references `laundry`
- `inventory_master.inventory_type_id` references `inventory_types`
- `kitchen_inventory.inventory_master_id` references `inventory_master`

### Notable uniqueness and constraints
- `packages`: unique per property by case-insensitive `package_name`
- `ref_rooms`: unique per property by case-insensitive `room_no`
- `ref_room_types`: unique room category/bed/ac combination
- `ref_packages`: unique case-insensitive package name
- `addresses`: unique primary address by `(entity_type, entity_id, address_type)`
- `visa_details`: unique `guest_id`
- `sidebar_links`: unique case-insensitive endpoint
- `laundry`: unique `(property_id, item_name)`

### Important indexes
- `bookings`: date range, property+arrival, property+departure, effective departure
- `room_details`: overlap-oriented indexes for active room allocations
- `properties`: city, owner, active status
- `audits`: `event_id`, `table_name`, `event_type`, `user_id`, `created_on`
- `enquiries`: property/status, property/created_on, follow-up date
- `inventory_master`: property/type index
- `laundry_order_items`: order and room number indexes

### Trigger and policy state
- Trigger found: `trg_backfill_role_sidebar_links`
- No `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements were found in `hotel-api/migrations`
- Current authorization is therefore application-enforced in middleware and services, not DB-enforced via RLS

### Schema observations
- The migration history includes commented legacy SQL and some duplicated or irregular numbering, for example multiple `0055`-prefixed files
- Migrations are replayed by filename sort order in `scripts/run-migrations.js`, with no schema history table or idempotence ledger beyond SQL-level guards

## Frontend Breakdown
### Structure
- `src/App.tsx`: route graph and access gating
- `src/pages/`: module pages
- `src/components/`: layout, forms, UI primitives, embedded module panels
- `src/redux/services/hmsApi.ts`: RTK Query endpoint definitions
- `src/redux/slices/isLoggedInSlice.ts`: auth state
- `src/hooks/`: auth bootstrap, auto logout, auto property selection
- `supabase/functions/supabase-client.ts`: Supabase client initialization

### State management approach
- Redux Toolkit is the primary app state container
- RTK Query owns backend API integration and cache invalidation
- Auth state is stored in a lightweight Redux slice and synchronized with `localStorage`

### Auth flow in the UI
- `LoginFormCard.tsx` signs in with Supabase Auth
- On success, the UI stores `access_token` in `localStorage`
- `useAuthBootstrap` calls `/users/me` to verify backend-side access and load user context
- `baseQueryWithErrorHandler` automatically attaches the token and logs the user out on `401`

### Route gating
`App.tsx`:
- Public routes: marketing pages, login, privacy, terms
- Protected app shell: wrapped by `AppLayout`
- Sidebar permissions are loaded from `/role-sidebar-link` and used to determine accessible paths

### Property selection behavior
`useAutoPropertySelect.ts`:
- Super admin and owner flows: auto-pick the first property from `/properties/get-my-properties`
- Property-bound users: use `/properties/address` to derive the assigned property

### Major frontend modules
- Reservation and booking management
- Property management
- Rooms and room status
- Payments
- Staff
- Roles and sidebar permissions
- Vendors
- Laundry pricing and orders
- Enquiries
- Menu, orders, restaurant tables
- Kitchen inventory and inventory master

## API Documentation Summary
The frontend uses a single RTK Query service, `src/redux/services/hmsApi.ts`, which provides the clearest inventory of currently consumed APIs. The backend additionally exposes some routes that are not wired into the current UI.

### Identity and RBAC
| Method | Route | Auth | Purpose | Request / Response summary |
| --- | --- | --- | --- | --- |
| `GET` | `/users/me` | Supabase JWT | Load current user, roles, and staff context | Returns user profile plus aggregated roles and staff metadata |
| `POST` | `/users` | `SUPER_ADMIN`, `OWNER` | Create a new auth user and internal user row | Body includes `email`, `password`, role inputs; response returns created user data |
| `GET` | `/users/by-role/:id` | `SUPER_ADMIN`, `OWNER` | List users by role | Returns user list with email, full name, and role |
| `GET` | `/users/user-by-property` | `OWNER`, `SUPER_ADMIN` | List users by property and role filters | Query-driven filtered list |
| `GET` | `/users/property/:propertyId` | `ALL` | List property users for a single role | Returns staff-linked user rows |
| `GET` | `/roles` | Supabase JWT | Fetch role catalog | Returns role list |
| `POST` | `/roles` | `ALL` | Create role | Body includes role name |
| `PATCH` | `/roles/:id` | `ALL` | Update role name | Body includes `roleName` |
| `DELETE` | `/roles/:id` | `ALL` | Delete role | Returns delete status |
| `GET` | `/sidebar-link` | `ALL`, `OWNER`, `ADMIN` | Fetch sidebar definitions | Used by UI for module listing and permission management |
| `POST` | `/sidebar-link` | `ALL` | Create sidebar link | Body defines label/endpoint hierarchy |
| `GET` | `/role-sidebar-link` | Supabase JWT | Fetch current user sidebar permissions | Returns sidebar links the current user can access |
| `POST` | `/role-sidebar-link` | `ALL` | Upsert role permission against sidebar link | Body includes `role_id`, `sidebar_link_id`, `can_read`, `can_create`, `can_update`, `can_delete` |
| `GET` | `/role-sidebar-link/:id` | `ALL` | Fetch permissions for a role | Returns permission rows for a role |

### Property and hotel setup
| Method | Route | Auth | Purpose | Request / Response summary |
| --- | --- | --- | --- | --- |
| `GET` | `/properties` | `ALL` | Paginated property listing with filters | Query params include paging, search, city, state, country |
| `POST` | `/properties` | `OWNER`, `SUPER_ADMIN` | Create property | Multipart payload supports property image and logo plus addresses and bank metadata |
| `GET` | `/properties/:id` | Supabase JWT | Get full property details | Returns property plus property and office address fields |
| `PATCH` | `/properties/:id` | `OWNER`, `SUPER_ADMIN` | Update property | Partial update across property and address tables |
| `GET` | `/properties/get-my-properties` | `SUPER_ADMIN`, `ADMIN`, `OWNER`, `ALL` | Get properties visible to current user | Used for property selection in UI |
| `GET` | `/properties/address` | `ALL` | Get primary address of current user's property | Used for single-property user auto-selection |
| `GET` | `/properties/:id/tax` | `ALL` | Get GST and room tax config | Returns `room_tax_rate` and `gst` |
| `GET` | `/properties/:id/restaurant-tables` | Supabase JWT | Get configured restaurant table count | Returns numeric table count |
| `GET` | `/properties/:id/image` | Public | Fetch property image blob | Binary response |
| `GET` | `/properties/:id/logo` | Public | Fetch property logo blob | Binary response |
| `GET` | `/property-floors/:propertyId` | Supabase JWT | Get floor definitions | Returns floor list |
| `POST` | `/property-floors/:propertyId` | Supabase JWT | Bulk upsert floors | Body contains floor definitions |
| `GET` | `/property-banks/property/:propertyId` | Supabase JWT | Fetch bank accounts | Returns property bank accounts |
| `POST` | `/property-banks/property/:propertyId` | Supabase JWT | Upsert bank accounts and delete removed ones | Body includes `accounts` and `deletedIds` |
| `GET` | `/room-categories` | Supabase JWT | Fetch room category master | Master data list |
| `GET` | `/bed-types` | Supabase JWT | Fetch bed type master | Master data list |
| `GET` | `/ac-types` | Supabase JWT | Fetch AC type master | Master data list |
| `GET` | `/room-type-rates/:propertyId` | Supabase JWT | Fetch room type pricing combinations | Supports category, bed type, AC filters |
| `PUT` | `/room-type-rates` | Supabase JWT | Bulk update room type pricing | Body contains updated pricing rows |
| `GET` | `/ref-packages` | Supabase JWT | Fetch package master catalog | Returns reference packages used in property pricing setup |

### Rooms, bookings, guests, vehicles, payments
| Method | Route | Auth | Purpose | Request / Response summary |
| --- | --- | --- | --- | --- |
| `GET` | `/rooms` | `ALL` | Get rooms by property | Query param `propertyId` |
| `POST` | `/rooms` | `ALL` | Bulk create rooms | Body includes room definitions |
| `PATCH` | `/rooms` | `ALL` | Bulk update rooms | Body includes room updates |
| `POST` | `/rooms/single-room` | `ALL` | Create a single room | Body includes property and room metadata |
| `GET` | `/rooms/available` | `ALL` | Find rooms available for a date range | Query params `propertyId`, `arrivalDate`, `departureDate` |
| `GET` | `/rooms/meta/:propertyId` | Supabase JWT | Fetch room-related masters | Returns room categories, bed types, AC types and related metadata |
| `GET` | `/rooms/status/property/:propertyId` | `ALL` | Daily room status board | Query param `date` |
| `GET` | `/rooms/booking/:bookingId` | `ALL` | Fetch rooms attached to a booking | Returns room allocations |
| `PATCH` | `/rooms/booking/:bookingId/cancel` | `ALL` | Cancel room allocation within booking | Partial room cancellation |
| `GET` | `/packages` | Supabase JWT | Get packages by property | Query param `property_id` with pagination |
| `POST` | `/packages` | Supabase JWT | Create property package | Body includes package pricing and configuration |
| `GET` | `/packages/:packageId` | Supabase JWT | Fetch package by id | Returns package detail |
| `PATCH` | `/packages/:packageId` | Supabase JWT | Update package | Partial package update |
| `DELETE` | `/packages/:packageId` | Supabase JWT | Deactivate package | Logical deactivation |
| `PUT` | `/packages/property/:propertyId` | `ALL` | Bulk update property packages | Array payload |
| `GET` | `/packages/user` | Supabase JWT | Packages visible to current user | Used in UI |
| `GET` | `/bookings` | `ALL` | Paginated booking list | Query params support property, date range, scope, status |
| `POST` | `/bookings` | `ALL` | Create booking | Body includes property, package, rooms, guest counts, discount, tax values, comments, pickup/drop flags |
| `GET` | `/bookings/export` | `ALL` | Export bookings for a date range | Returns report rows |
| `GET` | `/bookings/:id` | `ALL` | Get booking details | Returns booking financials, paid totals, restaurant aggregates, and room list |
| `PATCH` | `/bookings/:id/status` | `ALL` | Update booking lifecycle status | Body includes target status and optional comments |
| `PATCH` | `/bookings/:id/cancel` | `ALL` | Cancel booking | Body includes `cancellation_fee`, comments |
| `GET` | `/bookings/:id/today-in-house-bookings` | `ALL` | Booking ids currently in-house for a property | Property-scoped lookup |
| `GET` | `/bookings/:id/today-in-house-rooms` | `ALL` | Room numbers currently in-house for a property | Property-scoped lookup |
| `GET` | `/bookings/:id/guests` | `ALL` | Fetch guests by booking | Returns guest list |
| `POST` | `/bookings/:id/guests` | `ALL` | Upsert booking guests | Multipart form with `id_proofs` |
| `PUT` | `/bookings/:id/guests` | `ALL` | Update guest details | Multipart form with `id_proofs` |
| `GET` | `/guests/:bookingId/primary` | Supabase JWT | Fetch primary guest for booking | Returns lead guest data |
| `GET` | `/guests/:guestId/id-proof` | Public | Fetch guest ID proof blob | Binary response |
| `POST` | `/bookings/:id/vehicles` | `ALL` | Upsert vehicles for booking | Body contains vehicle list |
| `GET` | `/bookings/:id/vehicles` | `ALL` | Fetch vehicles for booking | Returns vehicle list |
| `GET` | `/payments/property/:propertyId` | `ALL` | Paginated payments by property | Filters by booking, method, and status |
| `GET` | `/payments/booking/:bookingId` | `ALL` | Payments for one booking | Returns payment list with creator info |
| `GET` | `/payments/:id` | `ALL` | Payment detail with booking and property context | Returns joined payment view |
| `POST` | `/payments` | `ALL` | Record payment | Body includes booking, property, amount, method, type, bank, comments |
| `PUT` | `/payments/:id` | `ALL` | Update payment | Partial update |

### Staff, vendors, enquiries, laundry, audits
| Method | Route | Auth | Purpose | Request / Response summary |
| --- | --- | --- | --- | --- |
| `GET` | `/staff` | Supabase JWT | Paginated staff listing | Query supports search, department, designation, status |
| `GET` | `/staff/:id` | Supabase JWT | Staff detail | Returns staff record |
| `POST` | `/staff` | Supabase JWT | Create staff | Multipart payload, can provision linked user |
| `PATCH` | `/staff/:id` | Supabase JWT | Update staff | Multipart payload |
| `PATCH` | `/staff` | Supabase JWT | Update staff password | Used for credential maintenance |
| `GET` | `/staff/by-property/:id` | `ALL` | Paginated staff by property | Filtered staff list |
| `GET` | `/staff/:id/image` | Public | Fetch staff image | Binary response |
| `GET` | `/staff/:id/id-proof` | Public | Fetch staff ID proof | Binary response |
| `GET` | `/vendors/property/:propertyId` | `ALL` | Paginated vendors by property | Searchable vendor listing |
| `GET` | `/vendors/all/property/:propertyId` | `ALL` | Non-paginated vendors by property | Used for select inputs |
| `POST` | `/vendors` | `ALL` | Create vendor | Vendor master create |
| `PUT` | `/vendors/:id` | `ALL` | Update vendor | Vendor master update |
| `GET` | `/enquiries` | `ALL` | Paginated property enquiries or export | Query supports `propertyId`, pagination, export flag |
| `POST` | `/enquiries` | `ALL` | Create enquiry | Sales/pre-booking capture |
| `PUT` | `/enquiries/:id` | `ALL` | Update enquiry | Status and reservation linkage updates |
| `GET` | `/laundries/property/:propertyId` | `ALL` | Paginated laundry pricing by property | Returns pricing setup |
| `POST` | `/laundries` | `ALL` | Bulk create laundry pricing rows | Batch setup |
| `PUT` | `/laundries` | `ALL` | Bulk update laundry pricing rows | Batch maintenance |
| `GET` | `/laundries/orders/property/:property_id` | Supabase JWT | Paginated laundry orders by property | Operational order listing |
| `GET` | `/laundries/orders/booking/:booking_id` | Supabase JWT | Laundry orders by booking | Booking-scoped order list |
| `POST` | `/laundries/orders` | Supabase JWT | Create laundry order | Body includes booking/property context and line items |
| `PUT` | `/laundries/orders/:id` | Supabase JWT | Update laundry order | Status or item updates |
| `GET` | `/audits` | Supabase JWT | Audit records by event and table | Query params `eventId`, `tableName`, pagination |
| `GET` | `/audits/table/:tableName` | Supabase JWT | Audit records by table and property | Query supports `propertyId` and pagination |

### Restaurant and inventory
| Method | Route | Auth | Purpose | Request / Response summary |
| --- | --- | --- | --- | --- |
| `GET` | `/menu/property/:propertyId` | `ALL` | Paginated menu items by property | Main menu listing |
| `GET` | `/menu/property/:propertyId/light` | `ALL` | Lightweight menu item list | Used in selection UIs |
| `GET` | `/menu/by-group/:groupId` | Supabase JWT | Menu items by item group | Query param `propertyId` |
| `GET` | `/menu/:id/image` | Public | Fetch menu item image | Binary response |
| `POST` | `/menu` | `ALL` | Create menu item | Multipart payload with optional image |
| `POST` | `/menu/bulk` | `ALL` | Bulk create menu items | Multipart batch payload |
| `PUT` | `/menu/:id` | `ALL` | Update menu item | Multipart payload |
| `PATCH` | `/menu` | `ALL` | Bulk update menu item state | Batch maintenance |
| `DELETE` | `/menu/:id` | `ALL` | Delete/deactivate menu item | Returns status |
| `GET` | `/menu-item-groups/:propertyId` | Supabase JWT | Item groups by property | Returns grouped categories |
| `GET` | `/menu-item-groups/light/:propertyId` | Supabase JWT | Lightweight item groups | Used for selectors |
| `POST` | `/menu-item-groups` | Supabase JWT | Create item group | Body includes property and name |
| `PUT` | `/menu-item-groups/:id` | Supabase JWT | Update item group | Body includes name and active state |
| `DELETE` | `/menu-item-groups/:id` | Supabase JWT | Delete item group | Returns status |
| `GET` | `/orders/property/:propertyId` | `ALL` | Paginated restaurant orders by property or export | Query supports page, limit, status, export |
| `GET` | `/orders/booking/:bookingId` | `ALL` | Restaurant orders by booking | Booking-scoped list |
| `GET` | `/orders/:id` | `ALL` | Restaurant order detail | Returns order plus items |
| `POST` | `/orders` | `ALL` | Create restaurant order | Body includes room/booking/table/menu item context |
| `PATCH` | `/orders/:id/status` | `ALL` | Update restaurant order status | Kitchen/service lifecycle |
| `PATCH` | `/orders/:id/payment` | `ALL` | Update restaurant order payment state | Billing lifecycle |
| `DELETE` | `/orders/:id` | `ALL` | Delete/cancel order | Returns status |
| `GET` | `/tables/property/:propertyId` | `ALL` | Paginated restaurant tables | Returns configured tables |
| `GET` | `/tables/property/:propertyId/light` | `ALL` | Lightweight restaurant tables | Used for selectors |
| `POST` | `/tables` | `ALL` | Create restaurant table | Single-row create |
| `PUT` | `/tables/:id` | `ALL` | Update restaurant table | Single-row update |
| `POST` | `/tables/bulk` | `ALL` | Bulk create restaurant tables | Batch setup |
| `PUT` | `/tables/bulk` | `ALL` | Bulk update restaurant tables | Batch maintenance |
| `GET` | `/kitchen` | Supabase JWT | Paginated kitchen inventory by property | Query includes `propertyId`, page, limit |
| `POST` | `/kitchen` | Supabase JWT | Create kitchen stock row | Links property to inventory master |
| `POST` | `/kitchen/adjust-stock` | Supabase JWT | Adjust stock for one item | Writes stock movement and audit entry |
| `PUT` | `/kitchen/:id` | Supabase JWT | Update kitchen inventory row | Maintenance update |
| `GET` | `/inventory` | Supabase JWT | Paginated inventory master listing | Query includes `propertyId` and pagination |
| `GET` | `/inventory/types` | Supabase JWT | Inventory type catalog | Returns type list |
| `GET` | `/inventory/:type/property/:propertyId` | Supabase JWT | Inventory master by type and property | Used for filtered selection |
| `POST` | `/inventory` | Supabase JWT | Create inventory master row | Body includes type and item metadata |
| `POST` | `/inventory/bulk` | Supabase JWT | Bulk create inventory master rows | Body contains `items` |
| `PUT` | `/inventory/:id` | Supabase JWT | Update inventory master row | Single-row update |
| `DELETE` | `/inventory/:id` | Supabase JWT | Delete inventory master row | Returns status |
| `GET` | `/delivery-partners` | Supabase JWT | Delivery partners by property | Query param `propertyId` |
| `GET` | `/delivery-partners/light` | Supabase JWT | Lightweight delivery partner list | Exposed by backend, not currently wired in RTK Query |
| `POST` | `/delivery-partners` | Supabase JWT | Create delivery partner | Body includes property-linked partner metadata |
| `PATCH` | `/delivery-partners/:id` | Supabase JWT | Update delivery partner | Partial update |
| `DELETE` | `/delivery-partners/:id` | Supabase JWT | Delete delivery partner | Returns status |

## Key Workflows
### 1. Login and auth bootstrap
1. User enters credentials in `hotel-ui/src/components/login/LoginFormCard.tsx`.
2. UI calls `supabase.auth.signInWithPassword`.
3. Access token is stored in `localStorage`.
4. `useAuthBootstrap` calls `/users/me`.
5. Backend validates the token, loads the internal user row from `public.users`, and rejects inactive users.
6. UI loads sidebar permissions from `/role-sidebar-link`.
7. Route access is determined from returned sidebar endpoints.

### 2. Property creation and owner linkage
1. UI submits multipart property payload to `/properties` or `/properties/by-owner/:id`.
2. Backend inserts into `properties`.
3. Backend inserts property and optional office addresses into `addresses`.
4. Backend updates or inserts `property_users` membership for the owner.
5. Post-create helpers generate property room type rates and initialize laundry setup.
6. Audit entry is written to `audits`.

### 3. Reservation creation
1. Reservation page fetches properties, packages, room types, tax config, and available rooms.
2. UI calculates billing inputs client-side and sends booking payload to `/bookings`.
3. `Booking.service.js` opens a DB transaction.
4. Booking row is inserted into `bookings`.
5. Each requested room is checked for overlap against active bookings.
6. Room allocations are inserted into `room_details`.
7. Transaction commits, then an audit entry is written.
8. UI typically follows with guest creation through `/bookings/:id/guests`.

### 4. Booking lifecycle updates
- `CHECKED_IN`: backend verifies no conflicting active room occupancy before status change
- `CHECKED_OUT`: backend stamps `actual_departure` and marks referenced rooms as dirty
- `NO_SHOW`: backend flips `is_no_show`
- `CANCELLED`: backend deactivates booking and can capture a cancellation fee
- All major state transitions attempt audit logging after commit

### 5. Guest and vehicle handling
- Guests are added or updated per booking using multipart forms because ID proofs can be uploaded
- Guest records can include nationality, identification, emergency contact, and visa details
- Vehicles are attached separately through `/bookings/:id/vehicles`

### 6. Payment lifecycle
1. UI submits payment details to `/payments`.
2. Backend inserts into `payments`.
3. Booking detail queries aggregate `SUM(paid_amount)` from active payments.
4. Audit entry records the payment creation or update.

### 7. Restaurant order flow
1. UI fetches menu, tables, booking-linked rooms, and delivery partners.
2. Order is created through `/orders` with item payload.
3. Backend stores order header and order items.
4. Status and payment state are updated separately through dedicated PATCH routes.
5. Booking detail queries also aggregate restaurant charges for financial visibility.

### 8. Laundry order flow
1. Laundry pricing is maintained per property under `/laundries`.
2. Order creation sends booking/property context and item rows to `/laundries/orders`.
3. Backend inserts order and `laundry_order_items` in a transaction.
4. Property and booking-specific order views are available for operations tracking.

### 9. Audit logging pattern
Most mutating services:
- Execute the core transaction first
- Attempt to log an audit event after commit
- Swallow audit logging failures in many places so business success is not rolled back by audit failure

This keeps operations resilient, but it also means audit completeness is best-effort rather than guaranteed.

## Security Considerations
### What is implemented
- JWTs are validated against Supabase JWKS instead of trusting unsigned client state
- Backend checks the internal `users` table and blocks inactive users
- Many routes are protected with `requireRole`
- Frontend clears auth state on `401`

### Risks and gaps
- Local `.env` files currently contain live-looking secrets and database credentials; these should not live in the repo or shared workspace
- No RLS policies were found in migrations, so accidental future direct-client data access would bypass the current backend-centric security model
- Several file/image endpoints are public and should be reviewed for intended exposure
- Auth relies on the presence and correctness of internal `users` rows in addition to Supabase Auth; bootstrap and admin provisioning must stay in sync
- Some routes use only `supabaseAuth` without `requireRole`, which may be correct but should be reviewed deliberately rather than left implicit

## Recommendations & Improvements
### High priority
- Remove committed secrets from `.env` files and rotate Supabase keys, DB credentials, and any exposed admin credentials
- Add DB-enforced protection if the product is expected to grow more direct Supabase client access; RLS is the obvious next layer
- Standardize public file-serving decisions for staff images, guest ID proofs, menu images, and property assets

### Maintainability
- Generate or maintain an OpenAPI spec from the Express routes to prevent drift against `hmsApi.ts`
- Normalize route/module naming; there are inconsistencies such as `property.route.js`, `RefPackage.route.js`, and mixed controller naming styles
- Reduce repeated service patterns by centralizing transaction helpers and audit wrappers
- Add a migration tracking table or stronger operational discipline around replayed migrations

### Data and performance
- Review expensive booking and room availability queries as data volume grows; current overlap logic is correct but SQL-heavy
- Consider documenting enum-like status values centrally because booking, payment, enquiry, restaurant, and laundry state machines are currently spread through services and UI
- Revisit commented legacy SQL and duplicate migration numbering to make schema history easier to trust

## Environment and Configuration
### Backend variables in use
- `PORT`
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

### Frontend variables in use
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Notes
- Backend DB access uses `DATABASE_URL`
- Migrations use `DATABASE_URL` directly through `pg.Client`
- Frontend only needs the API URL and public Supabase values for auth

## Final Takeaway
Atithiflow is best understood as a backend-driven hotel operations platform running on Supabase infrastructure. The frontend authenticates with Supabase, but operational behavior is governed by Express services and direct SQL against Postgres. Any developer extending the system should start by tracing the relevant route, controller, service, and migration together, because that is where business rules, tenancy boundaries, and data shape decisions currently live.

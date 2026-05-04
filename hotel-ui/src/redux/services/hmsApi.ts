import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { baseQueryWithErrorHandler } from './baseQuery'

export const hmsApi = createApi({
  reducerPath: 'hmsApi',
  baseQuery: baseQueryWithErrorHandler,
  tagTypes: [
    "Roles",
    "SidebarLinks",
    "RoleSidebarPermission",
    "Properties",
    "PropertyFloors",
    "Staff",
    "StaffImage",
    "StaffIdProof",
    "Me",
    "Users",
    "Rooms",
    "Staff",
    "Package",
    "AvailableRooms",
    "Bookings",
    "Vehicles",
    "Guests",
    "Payments",
    "roomTypes",
    "Vendors",
    "LaundryPricing",
    "LaundryOrders",
    "Enquiries",
    "Menu",
    "Orders",
    "Tables",
    "Kitchen",
    "Inventory",
    "MenuItemGroups",
    "DeliveryPartners",
    "Audits"
  ],
  endpoints: (builder) => ({

    getMe: builder.query<any, void>({
      query: () => {
        return {
          url: "/users/me",
          method: "GET",
        }
      },
      providesTags: ["Me"]
    }),

    createUser: builder.mutation<any, any>({
      query: ({ email, password, role_ids }) => {
        return {
          url: "/users",
          method: "POST",
          body: { email, password, role_ids },
        }
      }
    }),

    getUsersByRole: builder.query<any, any>({
      query: (role = "ADMIN") => {
        return {
          url: `/users/by-role/${role}`,
          method: "GET",
        }
      }
    }),

    getUsersByPropertyAndRole: builder.query<any, any>({
      query: ({ role = "ADMIN", propertyId }) => {
        return {
          url: `/users/property/${propertyId}?role=${role}`,
          method: "GET",
        }
      }
    }),

    getAllRoles: builder.query<any, any>({
      query: () => {
        return {
          url: "/roles",
          method: "GET",
        }
      },
      providesTags: ["Roles"]
    }),

    updateRoleName: builder.mutation<any, any>({
      query: ({ id, roleName }) => {
        return {
          url: `/roles/${id}`,
          method: "PATCH",
          body: { roleName },
        }
      },
      invalidatesTags: ["Roles"]
    }),

    getSidebarLinks: builder.query<any, any>({
      query: () => {
        return {
          url: "/role-sidebar-link",
          method: "GET",
        }
      },
      providesTags: ["SidebarLinks"]
    }),

    getAllSidebarLinks: builder.query<any, any>({
      query: () => {
        return {
          url: "/sidebar-link",
          method: "GET",
        }
      }
    }),

    getSidebarPermission: builder.query<any, any>({
      query: (roleId) => {
        return {
          url: `/role-sidebar-link/${roleId}`,
          method: "GET",
        }
      },
      providesTags: (result, error, roleId) => [
        { type: "RoleSidebarPermission", id: roleId }
      ]
    }),

    postRoleSidebarLink: builder.mutation({
      query: ({ role_id, sidebar_link_id, can_read, can_create, can_update, can_delete }) => {
        return {
          url: "/role-sidebar-link",
          body: { role_id, sidebar_link_id, can_read, can_create, can_update, can_delete },
          method: "POST",
        }
      },
      invalidatesTags: (result, error, body) => [
        { type: "RoleSidebarPermission", id: body.role_id },
        "SidebarLinks",
      ]
    }),

    createRole: builder.mutation({
      query: ({ roleName }) => {
        return {
          url: "/roles",
          method: "POST",
          body: { roleName },
        }
      },
      invalidatesTags: ["Roles"]
    }),

    getProperties: builder.query<any, any>({
      query: ({ page = 1, limit = 10, search = "", city = "", state = "", country = "" }) => {
        return {
          url: `/properties?page=${page}&limit=${limit}&city=${city}&state=${state}&country=${country}&search=${search}`,
          method: "GET",
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((item: any) => ({
              type: "Properties" as const,
              id: item.id,
            })),

            { type: "Properties", id: "LIST" },
          ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    getMyProperties: builder.query<any, any>({
      query: () => {
        return {
          url: `/properties/get-my-properties`,
          method: "GET",
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((item: any) => ({
              type: "Properties" as const,
              id: item.id,
            })),

            { type: "Properties", id: "LIST" },
          ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    getPropertyAddressByUser: builder.query<any, any>({
      query: () => {
        return {
          url: `/properties/address`,
          method: "GET",
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((item: any) => ({
              type: "Properties" as const,
              id: item.id,
            })),

            { type: "Properties", id: "LIST" },
          ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    updateProperties: builder.mutation<any, any>({
      query: ({ id, payload }) => {
        return {
          url: `/properties/${id}`,
          method: "PATCH",
          body: payload,
        }
      },

      invalidatesTags: (_result, _error, arg) => [
        { type: "Properties", id: arg.id },
      ],
    }),

    addProperty: builder.mutation<any, any>({
      query: (payload) => {
        return {
          url: "/properties",
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: [{ type: 'Properties', id: 'LIST' }],
    }),

    addPropertyBySuperAdmin: builder.mutation<any, any>({
      query: (payload) => {
        const owner_user_id = payload.get("owner_user_id")
        return {
          url: `properties/by-owner/${owner_user_id}`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: [{ type: 'Properties', id: 'LIST' }],
    }),

    getPropertyFloors: builder.query<any, any>({
      query: (propertyId) => {
        return {
          url: `/property-floors/${propertyId}`,
          method: "GET",
        }
      },

      providesTags: (result, error, propertyId) => {
        const floors = Array.isArray(result?.floors) ? result.floors : [];

        return [
          ...floors.map((floor: any) => ({
            type: "PropertyFloors" as const,
            id: `${propertyId}-${floor.floor_number}`,
          })),
          { type: "PropertyFloors", id: propertyId },
        ];
      }
    }),

    bulkUpsertPropertyFloors: builder.mutation<any, any>({
      query: (payload) => {
        return {
          url: `/property-floors/${payload.property_id}`,
          method: "POST",
          body: payload,
        }
      },

      invalidatesTags: (result, error, { property_id }) => [
        { type: "PropertyFloors", id: property_id },
      ],
    }),

    bulkUpsertRooms: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms`,
          method: "POST",
          body: payload,
        }
      }
    }),

    bulkUpdateRooms: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms`,
          method: "PATCH",
          body: payload,
        }
      },
      invalidatesTags: ["Rooms"]
    }),

    getRooms: builder.query({
      query: (propertyId) => {
        return {
          url: `/rooms?propertyId=${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Rooms"]
    }),

    getRoomsByBooking: builder.query({
      query: (bookingId) => {
        return {
          url: `/rooms/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Rooms"]
    }),

    addRoom: builder.mutation({
      query: (payload) => {
        return {
          url: `/rooms/single-room`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Rooms"]
    }),

    getStaff: builder.query<any, any>({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        department,
        designation,
        status,
      }) => {
        ;

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search,
        });

        if (department) params.append("department", department);
        if (designation) params.append("designation", designation);
        if (status) params.append("status", status);

        return {
          url: `/staff?${params.toString()}`,
          method: "GET",
        };
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((s: any) => ({
              type: "Staff" as const,
              id: s.id,
            })),
            { type: "Staff", id: "LIST" },
          ]
          : [{ type: "Staff", id: "LIST" }],
    }),

    getStaffById: builder.query<any, string>({
      query: (id) => {
        ;
        return {
          url: `/staff/${id}`,
          method: "GET",
        };
      },

      providesTags: (_r, _e, id) => [{ type: "Staff", id }],
    }),

    addStaff: builder.mutation<any, any>({
      query: (payload) => {
        ;
        return {
          url: "/staff",
          method: "POST",
          body: payload,
        };
      },

      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateStaff: builder.mutation<any, { id: string; payload: FormData }>({
      query: ({ id, payload }) => {
        return {
          url: `/staff/${id}`,
          method: "PATCH",
          body: payload,
        };
      },

      invalidatesTags: (_r, _e, arg) => [
        { type: "Staff", id: arg.id },
        { type: "Staff", id: "LIST" },
      ],
    }),

    updateStaffPassword: builder.mutation<any, { password: String, user_id: String }>({
      query: (payload) => {
        return {
          url: `/staff`,
          method: "PATCH",
          body: payload,
        };
      },
    }),

    getStaffImage: builder.query<Blob, string>({
      query: (id) => {
        ;
        return {
          url: `/staff/${id}/image`,
          method: "GET",
          responseHandler: (response) => response.blob(),
        };
      },

      providesTags: (_r, _e, id) => [{ type: "StaffImage", id }],
    }),

    getStaffIdProof: builder.query<Blob, string>({
      query: (id) => {
        ;
        return {
          url: `/staff/${id}/id-proof`,
          method: "GET",
          responseHandler: (response) => response.blob(),
        };
      },

      providesTags: (_r, _e, id) => [{ type: "StaffIdProof", id }],
    }),

    getStaffByProperty: builder.query<any, any>({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        department = "",
        status = "",
        property_id,
        export: isExport = false
      }) => {
        const params = new URLSearchParams();
        if (!isExport) {
          params.append("page", String(page));
          params.append("limit", String(limit));
        } else {
          params.append("export", "true");
        }

        if (search) params.append("search", search);
        if (department) params.append("department", department);
        if (status) params.append("status", status);

        return {
          url: `/staff/by-property/${property_id}?${params.toString()}`,
          method: "GET",
        }
      },

      providesTags: (result) =>
        result?.data
          ? [
            ...result.data.map((staff: any) => ({
              type: "Staff" as const,
              id: staff.id,
            })),
            { type: "Staff", id: "LIST" },
          ]
          : [{ type: "Staff", id: "LIST" }],
    }),

    getPackageById: builder.query({
      query: ({ packageId }) => {
        return {
          url: `/packages/${packageId}`,
          method: "GET",
        }
      }
    }),

    getPackagesByProperty: builder.query({
      query: ({ propertyId, page = 1, limit = 10 }) => {
        return {
          url: `/packages?property_id=${propertyId}&page=${page}&limit=${limit}`,
          method: "GET",
        }
      },
      providesTags: ["Package"]
    }),

    createPackage: builder.mutation({
      query: (payload) => {
        return {
          url: `/packages`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Package"]
    }),

    getPackagesByUser: builder.query({
      query: (payload) => {
        return {
          url: `/packages/user`,
          method: "GET",
        }
      },
    }),

    updatePackage: builder.mutation({
      query: ({ payload, packageId }) => {
        return {
          url: `/packages/${packageId}`,
          method: "PATCH",
          body: payload,
        }
      },
      invalidatesTags: ["Package"]
    }),

    updatePackagesBulk: builder.mutation({
      query: ({ packages, propertyId }) => {
        return {
          url: `/packages/property/${propertyId}`,
          method: "PUT",
          body: packages,
        }
      },
      invalidatesTags: ["Package"]
    }),

    deactivatePackage: builder.mutation({
      query: (packageId) => {
        return {
          url: `/packages/${packageId}`,
          method: "DELETE",
        }
      }
    }),

    availableRooms: builder.query({
      query: ({ propertyId, arrivalDate, departureDate }) => {
        return {
          url: `/rooms/available?propertyId=${propertyId}&arrivalDate=${arrivalDate}&departureDate=${departureDate}`,
          method: "GET",
        }
      },
      providesTags: ["AvailableRooms"]
    }),

    getAllRoomsMeta: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/rooms/meta/${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Rooms"]
    }),

    roomsStatus: builder.query({
      query: ({ date, propertyId }) => {
        return {
          url: `/rooms/status/property/${propertyId}?date=${date}`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    todayInHouseBookingIds: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/bookings/${propertyId}/today-in-house-bookings`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    todayInHouseBookingRooms: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/bookings/${propertyId}/today-in-house-rooms`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    createBooking: builder.mutation({
      query: (payload) => {
        return {
          url: `/bookings`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["AvailableRooms", "Audits"]
    }),

    getPropertyTax: builder.query({
      query: (propertyId) => {
        return {
          url: `/properties/${propertyId}/tax`,
          method: "GET",
        }
      }
    }),

    getPropertyRestaurantTables: builder.query({
      query: (propertyId) => {
        return {
          url: `/properties/${propertyId}/restaurant-tables`,
          method: "GET",
        }
      }
    }),

    getPropertyBanks: builder.query({
      query: (propertyId) => {
        return {
          url: `/property-banks/property/${propertyId}`,
          method: "GET",
        }
      }
    }),

    upsertPropertyBanks: builder.mutation({
      query: ({ propertyId, accounts, deletedIds }) => {
        return {
          url: `/property-banks/property/${propertyId}`,
          method: "POST",
          body: { accounts, deletedIds }
        }
      }
    }),

    getBookings: builder.query({
      query: ({ page = 1, limit = 10, propertyId, arrivalFrom, arrivalTo, departureFrom, departureTo, scope, status, search = "" }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          page: String(page),
          limit: String(limit)
        });
        if (arrivalFrom) params.append("arrivalFrom", arrivalFrom);
        if (arrivalTo) params.append("arrivalTo", arrivalTo);
        if (departureFrom) params.append("departureFrom", departureFrom);
        if (departureTo) params.append("departureTo", departureTo);
        if (scope) params.append("scope", scope);
        if (status) params.append("status", status);
        if (search) params.append("search", search);

        return {
          url: `/bookings?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    exportBookings: builder.query({
      query: ({ propertyId, arrivalFrom, arrivalTo, departureFrom, departureTo, scope, status }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          export: "true",
          ts: String(Date.now())
        });
        if (arrivalFrom) params.append("arrivalFrom", arrivalFrom);
        if (arrivalTo) params.append("arrivalTo", arrivalTo);
        if (departureFrom) params.append("departureFrom", departureFrom);
        if (departureTo) params.append("departureTo", departureTo);
        if (scope) params.append("scope", scope);
        if (status) params.append("status", status);

        return {
          url: `/bookings?${params.toString()}`,
          method: "GET",
        }
      },
    }),

    getBookingById: builder.query({
      query: (bookingId) => {
        return {
          url: `/bookings/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Bookings"]
    }),

    updateBooking: builder.mutation({
      query: ({ booking_id, status }) => {
        return {
          url: `/bookings/${booking_id}/status`,
          method: "PATCH",
          body: { status },
        }
      },
      invalidatesTags: ["Bookings", "Audits"]
    }),

    cancelBooking: builder.mutation({
      query: ({ booking_id, cancellation_fee, comments }) => {
        return {
          url: `/bookings/${booking_id}/cancel`,
          method: "PATCH",
          body: { cancellation_fee, comments },
        }
      },
      invalidatesTags: ["Bookings", "Audits"]
    }),

    addGuestsByBooking: builder.mutation({
      query: ({ bookingId, formData }) => {
        return {
          url: `/bookings/${bookingId}/guests`,
          method: "POST",
          body: formData,
        }
      },
      invalidatesTags: ["Guests", "Bookings", "Audits"]
    }),

    getGuestsByBooking: builder.query({
      query: ({ booking_id }) => {
        return {
          url: `/bookings/${booking_id}/guests`,
          method: "GET",
        }
      },
      providesTags: ["Guests"]
    }),

    getPrimaryGuestByBooking: builder.query({
      query: (booking_id) => {
        return {
          url: `/guests/${booking_id}/primary`,
          method: "GET",
        }
      },
      providesTags: ["Guests"]
    }),

    updateGuests: builder.mutation({
      query: ({ bookingId, formData }) => {
        return {
          url: `/bookings/${bookingId}/guests`,
          method: "PUT",
          body: formData,
        }
      },
      invalidatesTags: ["Guests", "Audits"]
    }),

    addVehicles: builder.mutation({
      query: ({ bookingId, vehicles }) => {
        return {
          url: `/bookings/${bookingId}/vehicles`,
          method: "POST",
          body: { vehicles },
        }
      },
      invalidatesTags: ["Vehicles"]
    }),

    getVehiclesByBooking: builder.query({
      query: ({ bookingId }) => {
        return {
          url: `/bookings/${bookingId}/vehicles`,
          method: "GET",
        }
      },
      providesTags: ["Vehicles"]
    }),

    getPaymentsByProperty: builder.query({
      query: ({ propertyId, page = 1, limit = 10, bookingId, method, status }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (bookingId) params.set("bookingId", bookingId);
        if (method) params.set("method", method);
        if (status) params.set("status", status);

        return {
          url: `/payments/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    getPaymentsById: builder.query({
      query: ({ paymentId }) => {
        return {
          url: `/payments/${paymentId}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    getPaymentsByBookingId: builder.query({
      query: ({ bookingId }) => {
        return {
          url: `/payments/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Payments"]
    }),

    createPayment: builder.mutation({
      query: ({ payload }) => {
        return {
          url: `/payments`,
          method: "POST",
          body: payload,
        }
      },
      invalidatesTags: ["Payments", "Bookings"]
    }),

    getRoomTypes: builder.query({
      query: ({ propertyId, page = 1, limit = 10, category, bedType, acType }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })

        if (category) params.set("category", category)
        if (bedType) params.set("bedType", bedType)
        if (acType) params.set("acType", acType)

        return {
          url: `/room-type-rates/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["roomTypes"]
    }),

    updateRoomTypes: builder.mutation({
      query: ({ payload }) => {
        return {
          url: `/room-type-rates`,
          method: "PUT",
          body: payload,
        }
      },
      invalidatesTags: ["roomTypes"]
    }),

    getPropertyVendors: builder.query({
      query: ({ propertyId, page = 1, limit = 10, search = "", type = "", status = "" }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit)
        });
        if (search) params.append("search", search);
        if (type) params.append("type", type);
        if (status) params.append("status", status);

        return {
          url: `/vendors/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Vendors"]
    }),

    exportPropertyVendors: builder.query({
      query: ({ propertyId, type = "", status = "" }) => {
        const params = new URLSearchParams({
          export: "true",
          ts: String(Date.now())
        });
        if (type) params.append("type", type);
        if (status) params.append("status", status);

        return {
          url: `/vendors/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
    }),

    getAllPropertyVendors: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/vendors/all/property/${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Vendors"]
    }),

    createVendor: builder.mutation({
      query: (payload) => {
        return {
          url: `/vendors`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Vendors"]
    }),

    updateVendor: builder.mutation({
      query: ({ vendorId, payload }) => {
        return {
          url: `/vendors/${vendorId}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Vendors"]
    }),

    getPropertyLaundryPricing: builder.query({
      query: ({ propertyId, page = 1, limit = 10 }) => {
        return {
          url: `/laundries/property/${propertyId}?page=${page}&limit=${limit}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryPricing"]
    }),

    createLaundryPricing: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["LaundryPricing"]
    }),

    updateLaundryPricing: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["LaundryPricing"]
    }),

    getPropertyLaundryOrders: builder.query({
      query: ({ propertyId, page = 1, limit = 10, status = "", vendor_status = "", search = "" }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit)
        });
        if (status) params.append("status", status);
        if (vendor_status) params.append("vendor_status", vendor_status);
        if (search) params.append("search", search);

        return {
          url: `/laundries/orders/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryOrders"]
    }),

    exportPropertyLaundryOrders: builder.query({
      query: ({ propertyId, status = "", vendor_status = "", search = "" }) => {
        const params = new URLSearchParams({
          export: "true",
          ts: String(Date.now())
        });
        if (status) params.append("status", status);
        if (vendor_status) params.append("vendor_status", vendor_status);
        if (search) params.append("search", search);

        return {
          url: `/laundries/orders/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
    }),

    getBookingLaundryOrders: builder.query({
      query: (bookingId) => {
        return {
          url: `/laundries/orders/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["LaundryOrders"]
    }),

    createLaundryOrder: builder.mutation({
      query: (payload) => {
        return {
          url: `/laundries/orders`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["LaundryOrders", "Audits"]
    }),

    updateLaundryOrder: builder.mutation({
      query: ({ id, ...payload }) => {
        return {
          url: `/laundries/orders/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["LaundryOrders", "Audits"]
    }),

    getPropertyEnquiries: builder.query({
      query: ({ propertyId, page, limit = 10, search = "", status = "" }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          page: String(page),
          pageSize: String(limit)
        });
        if (search) params.append("search", search);
        if (status) params.append("status", status);

        return {
          url: `/enquiries?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Enquiries"]
    }),

    exportPropertyEnquiries: builder.query({
      query: ({ propertyId, search = "", status = "" }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          export: "true",
          ts: String(Date.now())
        });
        if (search) params.append("search", search);
        if (status) params.append("status", status);

        return {
          url: `/enquiries?${params.toString()}`,
          method: "GET",
        }
      },
    }),

    createEnquiry: builder.mutation({
      query: (payload) => {
        return {
          url: `/enquiries`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Enquiries"]
    }),

    updateEnquiry: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/enquiries/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Enquiries"]
    }),

    getPropertyMenu: builder.query({
      query: ({ propertyId, page, limit = 10 }) => {
        return {
          url: `/menu/property/${propertyId}?page=${page}&limit=${limit}`,
          method: "GET",
        }
      },
      providesTags: ["Menu"]
    }),

    getPropertyMenuLight: builder.query({
      query: (propertyId) => {
        return {
          url: `/menu/property/${propertyId}/light`,
          method: "GET",
        }
      },
      providesTags: ["Menu"]
    }),

    getPropertyMenuByGroup: builder.query({
      query: ({ propertyId, groupId }) => {
        return {
          url: `/menu/by-group/${groupId}?propertyId=${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Menu"]
    }),

    createMenuItem: builder.mutation({
      query: (payload) => {
        return {
          url: `/menu`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Menu"]
    }),

    createMenuItemBulk: builder.mutation({
      query: (payload) => {
        return {
          url: `/menu/bulk`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Menu"]
    }),

    updateMenuItem: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/menu/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Menu"]
    }),

    getPropertyOrders: builder.query({
      query: ({ propertyId, page, limit = 10, status = "", payment_status = "", search = "" }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit)
        });
        if (status) params.append("status", status);
        if (payment_status) params.append("payment_status", payment_status);
        if (search) params.append("search", search);

        return {
          url: `/orders/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    exportPropertyOrders: builder.query({
      query: ({ propertyId, status = "", payment_status = "", search = "" }) => {
        const params = new URLSearchParams({
          export: "true",
          ts: String(Date.now())
        });
        if (status) params.append("status", status);
        if (payment_status) params.append("payment_status", payment_status);
        if (search) params.append("search", search);

        return {
          url: `/orders/property/${propertyId}?${params.toString()}`,
          method: "GET",
        }
      },
    }),

    getOrderById: builder.query({
      query: (id) => {
        return {
          url: `/orders/${id}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    getOrderByBooking: builder.query({
      query: (bookingId) => {
        return {
          url: `/orders/booking/${bookingId}`,
          method: "GET",
        }
      },
      providesTags: ["Orders"]
    }),

    createOrder: builder.mutation({
      query: (payload) => {
        return {
          url: `/orders`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Orders", "Bookings"]
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/orders/${id}/status`,
          method: "PATCH",
          body: payload
        }
      },
      invalidatesTags: ["Orders", "Bookings"]
    }),

    updateOrderPayment: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/orders/${id}/payment`,
          method: "PATCH",
          body: payload
        }
      },
      invalidatesTags: ["Orders"]
    }),

    getRestaurantTable: builder.query({
      query: ({ propertyId, page, limit = 10 }) => {
        return {
          url: `/tables/property/${propertyId}?page=${page}&limit=${limit}`,
          method: "GET",
        }
      },
      providesTags: ["Tables"]
    }),

    getRestaurantTablesLight: builder.query({
      query: (propertyId) => {
        return {
          url: `/tables/property/${propertyId}/light`,
          method: "GET",
        }
      },
      providesTags: ["Tables"]
    }),

    createRestaurantTable: builder.mutation({
      query: (payload) => {
        return {
          url: `/tables`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Tables"]
    }),

    updateRestaurantTable: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/tables/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Tables"]
    }),

    getKitchenInventory: builder.query({
      query: ({ propertyId, page = 1, limit = 10, search = "", export: isExport = false }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
        });
        if (!isExport) {
          params.append("page", String(page));
          params.append("limit", String(limit));
        } else {
          params.append("export", "true");
        }
        if (search) params.append("search", search);

        return {
          url: `/kitchen?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Kitchen"]
    }),

    createInventory: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen"]
    }),

    adjustStock: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen/adjust-stock`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen", "Audits"]
    }),

    bulkAdjustStock: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen/bulk`,
          method: "POST",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen", "Audits"]
    }),

    updateInventory: builder.mutation({
      query: ({ id, payload }) => {
        return {
          url: `/kitchen/${id}`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen", "Audits"]
    }),

    updateInventoryBulk: builder.mutation({
      query: (payload) => {
        return {
          url: `/kitchen/bulk`,
          method: "PUT",
          body: payload
        }
      },
      invalidatesTags: ["Kitchen"]
    }),

    getLogs: builder.query({
      query: ({ tableName, eventId, page, limit = 20 }) => {
        const params = new URLSearchParams({
          tableName,
          page: String(page),
          limit: String(limit)
        });
        if (eventId) params.append("eventId", String(eventId));
        return {
          url: `/audits?${params.toString()}`,
          method: "GET",
        }
      },
      providesTags: ["Audits"]
    }),

    getLogsByTable: builder.query({
      query: ({ tableName, page, propertyId, limit = 20 }) => {
        return {
          url: `/audits/table/${tableName}?page=${page}&limit=${limit}&propertyId=${propertyId}`,
          method: "GET",
        }
      },
      providesTags: ["Audits"]
    }),

    getInventoryTypes: builder.query({
      query: () => {
        return {
          url: "/inventory/types",
          method: "GET"
        }
      }
    }),

    getInventoryMasterByTypes: builder.query({
      query: ({ type, propertyId }) => {
        return {
          url: `/inventory/${type}/property/${propertyId}`,
          method: "GET"
        }
      },
      providesTags: ["Inventory"]
    }),

    getInventory: builder.query({
      query: ({ propertyId, page = 1, limit = 10, search = "", type = "", use_type = "", status = "" }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          page: String(page),
          limit: String(limit)
        });
        if (search) params.append("search", search);
        if (type) params.append("type", type);
        if (use_type) params.append("use_type", use_type);
        if (status) params.append("status", status);

        return {
          url: `/inventory?${params.toString()}`,
          method: "GET"
        }
      },
      providesTags: ["Inventory"]
    }),

    exportInventory: builder.query({
      query: ({ propertyId, type = "", use_type = "", status = "", search = "" }) => {
        const params = new URLSearchParams({
          propertyId: String(propertyId),
          export: "true",
          ts: String(Date.now())
        });
        if (type) params.append("type", type);
        if (use_type) params.append("use_type", use_type);
        if (status) params.append("status", status);
        if (search) params.append("search", search);

        return {
          url: `/inventory?${params.toString()}`,
          method: "GET"
        }
      },
    }),

    createInventoryMaster: builder.mutation({
      query: (body) => {
        return {
          url: `/inventory`,
          method: "POST",
          body
        }
      },
      invalidatesTags: ["Inventory"]
    }),

    createInventoryMasterBulk: builder.mutation({
      query: (body) => {
        return {
          url: `/inventory/bulk`,
          method: "POST",
          body: { items: body }
        }
      },
      invalidatesTags: ["Inventory"]
    }),

    checkDuplicateInventory: builder.mutation({
      query: (items) => {
        return {
          url: `/inventory/check-duplicates`,
          method: "POST",
          body: { items }
        }
      }
    }),

    updateInventoryMaster: builder.mutation({
      query: ({ body, id }) => {
        return {
          url: `/inventory/${id}`,
          method: "PUT",
          body
        }
      },
      invalidatesTags: ["Inventory"]
    }),

    getMenuItemGroups: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/menu-item-groups/${propertyId}`,
          method: "GET"
        }
      },
      providesTags: ["MenuItemGroups"]
    }),

    getMenuItemGroupsLight: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/menu-item-groups/light/${propertyId}`,
          method: "GET"
        }
      },
      providesTags: ["MenuItemGroups"]
    }),

    createMenuItemGroup: builder.mutation({
      query: (body) => {
        return {
          url: `/menu-item-groups`,
          method: "POST",
          body
        }
      },
      invalidatesTags: ["MenuItemGroups"]
    }),

    updateMenuItemGroup: builder.mutation({
      query: ({ name, id, is_active }) => {
        return {
          url: `/menu-item-groups/${id}`,
          method: "PUT",
          body: { name, is_active }
        }
      },
      invalidatesTags: ["MenuItemGroups"]
    }),

    getDeliveryPartners: builder.query({
      query: ({ propertyId }) => {
        return {
          url: `/delivery-partners?propertyId=${propertyId}`,
          method: "GET"
        }
      },
      providesTags: ["DeliveryPartners"]
    }),

    createDeliveryPartner: builder.mutation({
      query: (body) => {
        return {
          url: `/delivery-partners`,
          method: "POST",
          body
        }
      },
      invalidatesTags: ["DeliveryPartners"]
    }),

    updateDeliveryPartner: builder.mutation({
      query: ({ body, id }) => {
        return {
          url: `/delivery-partners/${id}`,
          method: "PATCH",
          body
        }
      },
      invalidatesTags: ["DeliveryPartners"]
    }),
  }),
})

export const {
  useLazyExportPropertyEnquiriesQuery,
  useLazyExportPropertyLaundryOrdersQuery,
  useLazyExportPropertyOrdersQuery,
  useLazyExportPropertyVendorsQuery,
  useLazyExportInventoryQuery,
  useLazyGetKitchenInventoryQuery,
  useLazyGetAllRolesQuery,
  useLazyGetSidebarLinksQuery,
  useLazyGetAllSidebarLinksQuery,
  useLazyGetSidebarPermissionQuery,
  useGetSidebarPermissionQuery,
  usePostRoleSidebarLinkMutation,
  useCreateRoleMutation,
  useGetPropertiesQuery,
  useUpdatePropertiesMutation,
  useAddPropertyMutation,
  useAddPropertyBySuperAdminMutation,
  useGetPropertyFloorsQuery,
  useLazyGetPropertyFloorsQuery,
  useBulkUpsertPropertyFloorsMutation,
  useGetStaffQuery,
  useGetStaffByIdQuery,
  useAddStaffMutation,
  useUpdateStaffMutation,
  useGetStaffImageQuery,
  useGetStaffIdProofQuery,
  useGetStaffByPropertyQuery,
  useLazyGetStaffByPropertyQuery,
  useLazyGetStaffByIdQuery,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLazyGetUsersByRoleQuery,
  useGetAllRolesQuery,
  useCreateUserMutation,
  useGetMyPropertiesQuery,
  useGetRoomsQuery,
  useBulkUpdateRoomsMutation,
  useBulkUpsertRoomsMutation,
  useGetPackageByIdQuery,
  useGetPackagesByPropertyQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeactivatePackageMutation,
  useAddRoomMutation,
  useGetPackagesByUserQuery,
  useAvailableRoomsQuery,
  useCreateBookingMutation,
  useGetPropertyTaxQuery,
  useGetBookingByIdQuery,
  useGetBookingsQuery,
  useCancelBookingMutation,
  useUpdateBookingMutation,
  useAddGuestsByBookingMutation,
  useGetGuestsByBookingQuery,
  useUpdateGuestsMutation,
  useAddVehiclesMutation,
  useGetVehiclesByBookingQuery,
  useGetPropertyAddressByUserQuery,
  useGetPaymentsByPropertyQuery,
  useGetPaymentsByIdQuery,
  useGetPaymentsByBookingIdQuery,
  useCreatePaymentMutation,
  useGetRoomTypesQuery,
  useUpdateRoomTypesMutation,
  useLazyGetUsersByPropertyAndRoleQuery,
  useRoomsStatusQuery,
  useUpdatePackagesBulkMutation,
  useGetPropertyBanksQuery,
  useUpsertPropertyBanksMutation,
  useGetPropertyVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useGetPropertyLaundryPricingQuery,
  useCreateLaundryPricingMutation,
  useUpdateLaundryPricingMutation,
  useGetPropertyLaundryOrdersQuery,
  useCreateLaundryOrderMutation,
  useUpdateLaundryOrderMutation,
  useGetPropertyEnquiriesQuery,
  useCreateEnquiryMutation,
  useUpdateEnquiryMutation,
  useGetAllPropertyVendorsQuery,
  useTodayInHouseBookingIdsQuery,
  useGetPropertyMenuQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useGetPropertyMenuLightQuery,
  useGetPropertyOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderPaymentMutation,
  useUpdateOrderStatusMutation,
  useGetRestaurantTableQuery,
  useCreateRestaurantTableMutation,
  useUpdateRestaurantTableMutation,
  useGetRestaurantTablesLightQuery,
  useGetKitchenInventoryQuery,
  useCreateInventoryMutation,
  useUpdateInventoryBulkMutation,
  useUpdateInventoryMutation,
  useGetBookingLaundryOrdersQuery,
  useGetLogsQuery,
  useGetRoomsByBookingQuery,
  useGetOrderByBookingQuery,
  useGetSidebarLinksQuery,
  useLazyExportBookingsQuery,
  useGetPropertyRestaurantTablesQuery,
  useGetInventoryQuery,
  useGetInventoryTypesQuery,
  useCreateInventoryMasterMutation,
  useUpdateInventoryMasterMutation,
  useGetInventoryMasterByTypesQuery,
  useLazyGetInventoryMasterByTypesQuery,
  useGetMenuItemGroupsLightQuery,
  useGetMenuItemGroupsQuery,
  useCreateMenuItemGroupMutation,
  useGetPropertyMenuByGroupQuery,
  useUpdateMenuItemGroupMutation,
  useGetDeliveryPartnersQuery,
  useCreateDeliveryPartnerMutation,
  useUpdateDeliveryPartnerMutation,
  useGetLogsByTableQuery,
  useGetAllRoomsMetaQuery,
  useAdjustStockMutation,
  useUpdateRoleNameMutation,
  useGetPrimaryGuestByBookingQuery,
  useUpdateStaffPasswordMutation,
  useCreateInventoryMasterBulkMutation,
  useBulkAdjustStockMutation,
  useTodayInHouseBookingRoomsQuery,
  useCreateMenuItemBulkMutation,
  useCheckDuplicateInventoryMutation,
  usePrefetch
} = hmsApi

import { getDb } from "../../utils/getDb.js"
import AuditService from "./Audit.service.js"
import GuestsService from "./Guests.service.js"

const parseStatusTimestamp = (value) => {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString();
};

class Booking {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async getBookings({
        propertyId,
        arrivalFrom,
        arrivalTo,
        departureFrom,
        departureTo,
        scope = "",
        status,
        search,
        page = 1,
        limit = 10,
    }) {
        const offset = (page - 1) * limit
        const property_id = Number(propertyId)
        const today = new Date().toISOString()

        const conditions = [`b.property_id = $1`]
        const params = [property_id]
        let idx = 2

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^BO0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const bookingId = Number(rawId);
                conditions.push(`(
                    b.id = $${idx}
                    OR b.booking_type ILIKE $${idx + 1}
                    OR b.booking_status ILIKE $${idx + 1}
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_details rd_search
                        JOIN public.ref_rooms rr_search
                            ON rr_search.id = rd_search.ref_room_id
                        WHERE rd_search.booking_id = b.id
                            AND COALESCE(rd_search.is_cancelled, false) = false
                            AND COALESCE(rd_search.is_changed, false) = false
                            AND rr_search.room_no ILIKE $${idx + 1}
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.vehicles v_search
                        WHERE v_search.booking_id = b.id
                            AND v_search.property_id = b.property_id
                            AND COALESCE(v_search.is_active, true) = true
                            AND v_search.vehicle_number ILIKE $${idx + 1}
                    )
                )`)
                params.push(bookingId, `%${normalizedSearch}%`)
                idx += 2
            } else {
                conditions.push(`(
                    b.booking_type ILIKE $${idx}
                    OR b.booking_status ILIKE $${idx}
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_details rd_search
                        JOIN public.ref_rooms rr_search
                            ON rr_search.id = rd_search.ref_room_id
                        WHERE rd_search.booking_id = b.id
                            AND COALESCE(rd_search.is_cancelled, false) = false
                            AND COALESCE(rd_search.is_changed, false) = false
                            AND rr_search.room_no ILIKE $${idx}
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.vehicles v_search
                        WHERE v_search.booking_id = b.id
                            AND v_search.property_id = b.property_id
                            AND COALESCE(v_search.is_active, true) = true
                            AND v_search.vehicle_number ILIKE $${idx}
                    )
                )`)
                params.push(`%${normalizedSearch}%`)
                idx++
            }
        }

        // --- Arrival Date Filter ---
        if (arrivalFrom && arrivalFrom.length === 10) {
            conditions.push(`b.estimated_arrival >= $${idx}`)
            params.push(`${arrivalFrom}T00:00:00.000Z`)
            idx++
        }
        if (arrivalTo && arrivalTo.length === 10) {
            conditions.push(`b.estimated_arrival <= $${idx}`)
            params.push(`${arrivalTo}T23:59:59.999Z`)
            idx++
        }

        // --- Departure Date Filter ---
        if (departureFrom && departureFrom.length === 10) {
            conditions.push(`b.estimated_departure >= $${idx}`)
            params.push(`${departureFrom}T00:00:00.000Z`)
            idx++
        }
        if (departureTo && departureTo.length === 10) {
            conditions.push(`b.estimated_departure <= $${idx}`)
            params.push(`${departureTo}T23:59:59.999Z`)
            idx++
        }

        // --- Legacy Scope Fallback ---
        if (!arrivalFrom && !arrivalTo && !departureFrom && !departureTo) {
            if (scope === "upcoming") {
                conditions.push(`b.actual_departure IS NULL`)
            } else if (scope === "past") {
                conditions.push(`b.estimated_departure < $${idx}`)
                params.push(today)
                idx++
            }
        }

        if (status) {
            conditions.push(`b.booking_status = $${idx}`)
            params.push(status)
            idx++
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`

        /* ---------- DATA QUERY ---------- */
        const { rows } = await this.#DB.query(
            `
            SELECT
            b.id,
            b.booking_status,
            b.booking_type,
            b.booking_date,
            b.estimated_arrival,
            b.estimated_departure,
            b.booking_nights,
            b.total_guest,
            b.final_amount,
            b.drop,
            b.pickup,

            COALESCE(
                ARRAY_AGG(rr.room_no) FILTER (WHERE rr.room_no IS NOT NULL),
                '{}'
            ) AS room_numbers

            FROM public.bookings b
            LEFT JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND COALESCE(rd.is_cancelled, false) = false
                AND COALESCE(rd.is_changed, false) = false

            LEFT JOIN public.ref_rooms rr ON rr.id = rd.ref_room_id
            ${whereClause}
            GROUP BY b.id
            ORDER BY b.id DESC
            LIMIT $${idx} OFFSET $${idx + 1}
            `,
            [...params, limit, offset]
        )

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.bookings b
            ${whereClause}
            `,
            params
        )

        return {
            pagination: {
                page,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            },
            bookings: rows,
        };
    }

    async createBooking({
        property_id,
        package_id,
        booking_type,
        booking_status,
        booking_date,
        estimated_arrival,
        estimated_departure,
        adult,
        child,
        discount_type,
        rooms,
        discount,
        price_before_tax,
        discount_amount,
        price_after_discount,
        gst_amount,
        room_tax_amount,
        comments,
        created_by,
        drop,
        pickup,
        pickup_time,
        pickup_location,
        drop_time,
        drop_location,
        estimated_arrival_time
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const finalAmount =
                Number(price_after_discount) +
                Number(gst_amount) +
                Number(room_tax_amount);

            /* ------------------ INSERT BOOKING ------------------ */
            const { rows: bookingRows } = await client.query(
                `
            INSERT INTO public.bookings (
                property_id,
                package_id,
                booking_type,
                booking_status,
                booking_date,
                estimated_arrival,
                estimated_departure,
                adult,
                child,
                total_guest,
                discount_type,
                discount,
                created_by,
                booking_nights,
                price_before_tax,
                discount_amount,
                price_after_discount,
                gst_amount,
                room_tax_amount,
                final_amount,
                comments,
                pickup,
                drop,
                pickup_time,
                pickup_location,
                drop_time,
                drop_location,
                estimated_arrival_time
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,($8::int + $9::int),
                $10,$11,$12,
                (DATE($7) - DATE($6)),
                $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
            )
            RETURNING *
            `,
                [
                    property_id,
                    package_id,
                    booking_type,
                    booking_status ?? 'CONFIRMED',
                    booking_date,
                    estimated_arrival,
                    estimated_departure,
                    adult || 0,
                    child || 0,
                    discount_type,
                    discount || 0,
                    created_by,
                    price_before_tax,
                    discount_amount,
                    price_after_discount,
                    gst_amount,
                    room_tax_amount,
                    finalAmount,
                    comments || "",
                    pickup,
                    drop,
                    pickup_time || null,
                    pickup_location || null,
                    drop_time || null,
                    drop_location || null,
                    estimated_arrival_time
                ]
            );

            const booking = bookingRows[0];

            /* ------------------ ROOM AVAILABILITY CHECK ------------------ */
            for (const room of rooms) {
                const { rows: conflicts } = await client.query(
                    `
                SELECT
                    rr.room_no,
                    b.id AS booking_id,
                    b.booking_status
                FROM public.room_details rd
                JOIN public.bookings b
                  ON b.id = rd.booking_id
                 AND b.property_id = $1
                 AND b.is_active = true
                JOIN public.ref_rooms rr
                  ON rr.id = rd.ref_room_id
                WHERE rd.ref_room_id = $2
                  AND COALESCE(rd.is_cancelled, false) = false
                  AND COALESCE(rd.is_changed, false) = false
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
                  AND (
                        b.estimated_arrival < $4
                    AND COALESCE(b.actual_departure, b.estimated_departure) > $3
                  )
                LIMIT 1
                `,
                    [
                        property_id,
                        room.ref_room_id,
                        estimated_arrival,
                        estimated_departure,
                    ]
                );

                if (conflicts.length > 0) {
                    throw {
                        code: "ROOM_NOT_AVAILABLE",
                        message: "One or more rooms are not available",
                        conflicted_rooms: conflicts
                    };
                }

                /* ------------------ INSERT ROOM DETAILS ------------------ */
                await client.query(
                    `
                INSERT INTO public.room_details (
                    booking_id,
                    ref_room_id,
                    room_type,
                    room_status,
                    is_cancelled,
                    created_by
                )
                VALUES ($1,$2,$3,'BOOKED',false,$4)
                `,
                    [
                        booking.id,
                        room.ref_room_id,
                        room.room_type,
                        created_by
                    ]
                );
            }

            await client.query("COMMIT");
            try {


                const roomIds = rooms.map(r => r.ref_room_id);

                const query = `
                            SELECT id, room_no
                            FROM public.ref_rooms
                            WHERE id = ANY($1::bigint[])
                            `;

                const { rows } = await this.#DB.query(query, [roomIds]);

                const roomNo = rows.map(r => r.room_no);

                await AuditService.log({
                    property_id,
                    event_id: booking.id,
                    table_name: "bookings",
                    event_type: "CREATE",
                    task_name: "Create Booking",
                    comments: "New booking created",
                    details: JSON.stringify({
                        booking_type,
                        booking_status,
                        estimated_arrival,
                        estimated_departure,
                        rooms: roomNo
                    }),
                    user_id: created_by
                });
            } catch (error) { }

            return booking;

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async getBookingById(bookingId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            b.id,
            b.property_id,
            b.package_id,

            b.booking_status,
            b.booking_type,
            b.booking_date,

            b.estimated_arrival,
            b.estimated_departure,
            b.actual_arrival,
            b.actual_departure,
            b.estimated_arrival_time,

            b.booking_nights,
            b.adult,
            b.child,
            b.total_guest,

            b.discount_type,
            b.discount,
            b.discount_amount,

            b.price_before_tax,
            b.price_after_discount,
            b.gst_amount,
            b.room_tax_amount,
            b.final_amount,
            b.early_checkin_amount,
            b.delayed_checkout_amount,

            b.cancellation_fee,
            b.is_no_show,

            b.comments,
            b.is_active,

            b.created_by,
            b.created_on,
            b.updated_by,
            b.updated_on,

            b.drop,
            b.pickup,
            b.pickup_time,
            b.pickup_location,
            b.drop_time,
            b.drop_location,

            COALESCE(paid.total_paid_amount, 0) AS paid_amount,

            (b.guest_image IS NOT NULL) AS has_guest_image,

            /* ============================
               RESTAURANT AGGREGATES
            ============================ */
            COALESCE(ro.restaurant_total_amount, 0) AS restaurant_total_amount,
            COALESCE(ro.restaurant_paid_amount, 0)  AS restaurant_paid_amount,

            COALESCE(
                json_agg(
                    json_build_object(
                        'room_id', rd.ref_room_id,
                        'room_no', rr.room_no,
                        'room_type', rd.room_type,
                        'room_status', rd.room_status
                    )
                ) FILTER (WHERE rd.id IS NOT NULL),
                '[]'
            ) AS rooms

        FROM public.bookings b

        /* -------- PAYMENTS -------- */
        LEFT JOIN (
            SELECT
                booking_id,
                SUM(paid_amount) AS total_paid_amount
            FROM public.payments
            WHERE is_active = true
            GROUP BY booking_id
        ) paid ON paid.booking_id = b.id

        /* -------- RESTAURANT ORDERS -------- */
        LEFT JOIN (
            SELECT
                booking_id,

                -- total of non-cancelled orders
                SUM(
                    CASE 
                        WHEN order_status != 'Cancelled' 
                        THEN total_amount 
                        ELSE 0 
                    END
                ) AS restaurant_total_amount,

                -- total of paid orders
                SUM(
                    CASE 
                        WHEN payment_status = 'Paid' 
                        THEN total_amount 
                        ELSE 0 
                    END
                ) AS restaurant_paid_amount

            FROM public.restaurant_orders
            GROUP BY booking_id
        ) ro ON ro.booking_id = b.id

        /* -------- ROOMS -------- */
        LEFT JOIN public.room_details rd
            ON rd.booking_id = b.id
            AND COALESCE(rd.is_cancelled, false) = false
            AND COALESCE(rd.is_changed, false) = false

        LEFT JOIN public.ref_rooms rr
            ON rr.id = rd.ref_room_id

        WHERE b.id = $1
        GROUP BY
            b.id,
            paid.total_paid_amount,
            ro.restaurant_total_amount,
            ro.restaurant_paid_amount
        `,
            [Number(bookingId)]
        );

        if (!rows.length) return null;

        const booking = rows[0];

        /* -------- PRIMARY GUEST -------- */
        const primaryGuest = await GuestsService.getPrimaryGuestByBookingId(bookingId);
        booking.primary_guest = primaryGuest;

        return booking;
    }

    async cancelBooking({
        bookingId,
        cancellationFee = 0,
        comments,
        cancelledBy
    }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            const { rows } = await client.query(
                `
                SELECT
                    id,
                    booking_status,
                    final_amount
                FROM public.bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [Number(bookingId)]
            )

            if (!rows.length) {
                throw new Error("Booking not found")
            }

            const booking = rows[0]

            if (['CANCELLED', 'CHECKED_OUT'].includes(booking.booking_status)) {
                throw new Error(
                    `Booking cannot be cancelled (current status: ${booking.booking_status})`
                )
            }

            const { rows: updatedRows } = await client.query(
                `
                UPDATE public.bookings
                SET
                    booking_status = 'CANCELLED',
                    is_active = false,
                    cancellation_fee = $2,
                    comments = COALESCE($3, comments),
                    updated_by = $4,
                    updated_on = now()
                WHERE id = $1
                RETURNING *
                `,
                [
                    bookingId,
                    cancellationFee,
                    comments,
                    cancelledBy
                ]
            )

            await client.query("COMMIT")

            try {
                await AuditService.log({
                    property_id: updatedRows[0].property_id,
                    event_id: bookingId,
                    table_name: "bookings",
                    event_type: "CANCEL",
                    task_name: "Cancel Booking",
                    comments: comments || "Booking cancelled",
                    details: JSON.stringify({
                        cancellation_fee: cancellationFee,
                        previous_status: booking.booking_status
                    }),
                    user_id: cancelledBy
                });
            } catch (error) {

            }

            return {
                message: "Booking cancelled successfully",
                booking: updatedRows[0]
            }

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async updateBookingStatus({
        bookingId,
        status,
        comments,
        actual_arrival,
        actual_departure,
        is_early_checkin,
        is_delayed_checkout,
        earlyCheckinAmount,
        delayedCheckoutAmount,
        early_checkin_amount,
        delayed_checkout_amount,
        audit_comment,
        updatedBy
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            /* ------------------------------------------------ */
            /* 🔒 Lock booking row */
            /* ------------------------------------------------ */
            const { rows } = await client.query(
                `
            SELECT id, booking_status, property_id, estimated_arrival, estimated_departure,
                   final_amount, early_checkin_amount, delayed_checkout_amount
            FROM public.bookings
            WHERE id = $1
            FOR UPDATE
            `,
                [Number(bookingId)]
            );

            if (!rows.length) {
                throw new Error("Booking not found");
            }

            const currentStatus = rows[0].booking_status;

            /* ------------------------------------------------ */
            /* 🚫 RULE 1: Prevent CHECKOUT without CHECKIN */
            /* ------------------------------------------------ */
            if (status === "CHECKED_OUT" && currentStatus !== "CHECKED_IN") {
                throw {
                    code: "INVALID_CHECKOUT",
                    message: "Cannot checkout a booking that was never checked in",
                    booking_id: bookingId,
                    current_status: currentStatus
                };
            }

            /* ------------------------------------------------ */
            /* 🚫 RULE 1.5: Prevent CHECKIN before arrival date */
            /* ------------------------------------------------ */
            if (status === "CHECKED_IN") {
                const arrivalDate = new Date(rows[0].estimated_arrival);
                const today = actual_arrival ? new Date(actual_arrival) : new Date();
                
                // Compare dates (stripping time if needed, or simply compare timestamps)
                // If the arrival date is clearly in the future (next day or later)
                // Setting time to 00:00:00 to compare just the date parts
                const arrivalDateOnly = new Date(arrivalDate);
                arrivalDateOnly.setHours(0, 0, 0, 0);
                
                const todayOnly = new Date(today);
                todayOnly.setHours(0, 0, 0, 0);

              
            }

            /* ------------------------------------------------ */
            /* 🔍 RULE 2: Room availability validation (CHECKED_IN) */
            /* ------------------------------------------------ */
            if (status === "CHECKED_IN") {

                const { rows: conflicts } = await client.query(
                    `
                SELECT 
                    r.id              AS room_id,
                    r.room_no,
                    rd2.booking_id    AS active_booking_id,
                    b2.booking_status AS active_booking_status
                FROM public.room_details rd
                JOIN public.ref_rooms r 
                    ON r.id = rd.ref_room_id

                /* get current booking dates */
                JOIN public.bookings b1
                    ON b1.id = rd.booking_id

                /* other active bookings using same rooms */
                LEFT JOIN public.room_details rd2
                    ON rd2.ref_room_id = r.id
                   AND rd2.booking_id != $1

                LEFT JOIN public.bookings b2
                    ON b2.id = rd2.booking_id
                   AND b2.is_active = true
                   AND b2.booking_status IN ('CONFIRMED','CHECKED_IN')
                   /* Standard date overlap logic */
                   AND b2.estimated_arrival < COALESCE(b1.actual_departure, b1.estimated_departure)
                   AND COALESCE(b2.actual_departure, b2.estimated_departure) > COALESCE(b1.actual_arrival, b1.estimated_arrival)

                WHERE rd.booking_id = $1
                  AND b2.id IS NOT NULL
                `,
                    [bookingId]
                );

                if (conflicts.length) {
                    throw {
                        code: "ROOM_NOT_AVAILABLE",
                        message: "One or more rooms are not available for check-in",
                        booking_id: bookingId,
                        conflicted_rooms: conflicts
                    };
                }
            }

            /* ------------------------------------------------ */
            /* ✅ Status update */
            /* ------------------------------------------------ */

            let extraUpdates = ``;
            const updateParams = [
                bookingId,
                status,
                comments,
                updatedBy
            ];

            const currentFinalAmount = Number(rows[0].final_amount || 0);
            let newFinalAmount = currentFinalAmount;

            let newEarlyCheckinAmount = Number(rows[0].early_checkin_amount || 0);
            let newDelayedCheckoutAmount = Number(rows[0].delayed_checkout_amount || 0);

            if (is_early_checkin && status === 'CHECKED_IN') {
                const payloadEarlyCheckinAmount = earlyCheckinAmount !== undefined ? earlyCheckinAmount : early_checkin_amount;
                if (payloadEarlyCheckinAmount === undefined || payloadEarlyCheckinAmount === null || payloadEarlyCheckinAmount === "") {
                    throw { code: "VALIDATION_ERROR", message: "Early Check-In amount is required" };
                }
                const parsedEarlyAmount = Number(payloadEarlyCheckinAmount);
                if (isNaN(parsedEarlyAmount) || parsedEarlyAmount < 0) {
                    throw { code: "VALIDATION_ERROR", message: "Early Check-In amount must be >= 0" };
                }
                const oldEarlyAmount = newEarlyCheckinAmount;
                newEarlyCheckinAmount = parsedEarlyAmount;
                const delta = newEarlyCheckinAmount - oldEarlyAmount;
                newFinalAmount = newFinalAmount + delta;

                updateParams.push(newEarlyCheckinAmount);
                extraUpdates += `, early_checkin_amount = $${updateParams.length}`;
            }

            if (is_delayed_checkout && status === 'CHECKED_OUT') {
                const payloadDelayedCheckoutAmount = delayedCheckoutAmount !== undefined ? delayedCheckoutAmount : delayed_checkout_amount;
                if (payloadDelayedCheckoutAmount === undefined || payloadDelayedCheckoutAmount === null || payloadDelayedCheckoutAmount === "") {
                    throw { code: "VALIDATION_ERROR", message: "Delayed Checkout amount is required" };
                }
                const parsedDelayedAmount = Number(payloadDelayedCheckoutAmount);
                if (isNaN(parsedDelayedAmount) || parsedDelayedAmount < 0) {
                    throw { code: "VALIDATION_ERROR", message: "Delayed Checkout amount must be >= 0" };
                }
                const oldDelayedAmount = newDelayedCheckoutAmount;
                newDelayedCheckoutAmount = parsedDelayedAmount;
                const delta = newDelayedCheckoutAmount - oldDelayedAmount;
                newFinalAmount = newFinalAmount + delta;

                updateParams.push(newDelayedCheckoutAmount);
                extraUpdates += `, delayed_checkout_amount = $${updateParams.length}`;
            }

            if (newFinalAmount !== currentFinalAmount) {
                updateParams.push(newFinalAmount);
                extraUpdates += `, final_amount = $${updateParams.length}`;
            }

            if (status === 'CHECKED_IN') {
                const actualArrival = parseStatusTimestamp(actual_arrival);

                if (!actualArrival) {
                    throw {
                        code: actual_arrival ? "INVALID_STATUS_TIME" : "STATUS_TIME_REQUIRED",
                        message: actual_arrival ? "Invalid check-in time" : "Check-in time is required",
                        booking_id: bookingId
                    };
                }

                updateParams.push(actualArrival);
                extraUpdates += `, actual_arrival = $${updateParams.length}`;
            }

            if (status === 'CHECKED_OUT') {
                const actualDeparture = parseStatusTimestamp(actual_departure);

                if (!actualDeparture) {
                    throw {
                        code: actual_departure ? "INVALID_STATUS_TIME" : "STATUS_TIME_REQUIRED",
                        message: actual_departure ? "Invalid checkout time" : "Checkout time is required",
                        booking_id: bookingId
                    };
                }

                const estDepartureDate = new Date(rows[0].estimated_departure);
                const actDepartureDate = new Date(actualDeparture);

                const estDepOnly = new Date(estDepartureDate);
                estDepOnly.setHours(0, 0, 0, 0);

                const actDepOnly = new Date(actDepartureDate);
                actDepOnly.setHours(0, 0, 0, 0);

                if (actDepOnly > estDepOnly) {
                    const msPerDay = 24 * 60 * 60 * 1000;
                    const diffMs = Date.UTC(actDepOnly.getFullYear(), actDepOnly.getMonth(), actDepOnly.getDate()) - 
                                   Date.UTC(estDepOnly.getFullYear(), estDepOnly.getMonth(), estDepOnly.getDate());
                    const diffDays = Math.round(diffMs / msPerDay);

                    const { rows: conflicts } = await client.query(
                        `
                        SELECT 
                            r.id              AS room_id,
                            r.room_no,
                            rd2.booking_id    AS active_booking_id
                        FROM public.room_details rd
                        JOIN public.ref_rooms r 
                            ON r.id = rd.ref_room_id
                        JOIN public.room_details rd2
                            ON rd2.ref_room_id = r.id
                           AND rd2.booking_id != $1
                           AND COALESCE(rd2.is_cancelled, false) = false
                           AND COALESCE(rd2.is_changed, false) = false
                        JOIN public.bookings b2
                            ON b2.id = rd2.booking_id
                           AND b2.is_active = true
                           AND b2.booking_status IN ('CONFIRMED','CHECKED_IN')
                           AND b2.estimated_arrival < $2
                           AND COALESCE(b2.actual_departure, b2.estimated_departure) > $3
                        WHERE rd.booking_id = $1
                          AND COALESCE(rd.is_cancelled, false) = false
                          AND COALESCE(rd.is_changed, false) = false
                        `,
                        [Number(bookingId), actualDeparture, rows[0].estimated_departure]
                    );

                    if (conflicts.length > 0) {
                        const conflict = conflicts[0];
                        const bookingDisplayId = `BO${String(conflict.active_booking_id).padStart(3, '0')}`;
                        if (diffDays === 1) {
                            throw {
                                code: "NEXT_DAY_CHECKOUT_CONFLICT",
                                message: `Room ${conflict.room_no} is already reserved for Booking #${bookingDisplayId} on the requested extended date. Please shift the current guest to another available room or create a new booking with a different room.`,
                                booking_id: bookingId
                            };
                        } else {
                            throw {
                                code: "LONGER_STAY_CONFLICT",
                                message: "Selected room is not available for the extended dates. Please shift the guest to another available room or create a new booking with available rooms.",
                                booking_id: bookingId
                            };
                        }
                    } else {
                        if (diffDays === 1) {
                            throw {
                                code: "NEXT_DAY_CHECKOUT_NOT_ALLOWED",
                                message: "Delayed checkout is allowed only on the scheduled checkout date. For next-day or longer stay, please create a new booking or Shift the Guest to another room.",
                                booking_id: bookingId
                            };
                        } else {
                            throw {
                                code: "LONGER_STAY_NOT_ALLOWED",
                                message: "This is a longer stay extension, not delayed checkout. Please create a new booking or use the Stay Extension flow after checking room availability.",
                                booking_id: bookingId
                            };
                        }
                    }
                }

                updateParams.push(actualDeparture);
                extraUpdates += `, actual_departure = $${updateParams.length}`;
            }

            if (status === 'NO_SHOW') {
                extraUpdates += `, is_no_show = true`;
            }

            if (status === 'CANCELLED') {
                extraUpdates += `, is_active = false`;
            }

            const { rows: updatedRows } = await client.query(
                `
            UPDATE public.bookings
            SET
                booking_status = $2
                ${extraUpdates},
                comments = COALESCE($3, comments),
                updated_by = $4,
                updated_on = now()
            WHERE id = $1
            RETURNING *
            `,
                updateParams
            );

            /* ------------------------------------------------ */
            /* 🧹 Dirty rooms on checkout */
            /* ------------------------------------------------ */
            if (status === 'CHECKED_OUT') {
                await client.query(
                    `
                UPDATE public.ref_rooms r
                SET
                    dirty = true,
                    updated_on = now(),
                    updated_by = $2
                FROM public.room_details rd
                WHERE rd.booking_id = $1
                  AND rd.ref_room_id = r.id
                `,
                    [bookingId, updatedBy]
                );
            }

            await client.query("COMMIT");

            /* ------------------------------------------------ */
            /* 🧾 Audit */
            /* ------------------------------------------------ */
            let auditCommentText = `Status changed to ${status}`;
            if (is_early_checkin && audit_comment) {
                auditCommentText += `\nEarly Check-In: ${audit_comment}`;
            } else if (is_delayed_checkout && audit_comment) {
                auditCommentText += `\nDelayed Checkout: ${audit_comment}`;
            } else if (audit_comment) {
                auditCommentText += `\nComment: ${audit_comment}`;
            }

            try {
                const auditDetails = {
                    old_status: currentStatus,
                    new_status: status
                };
                if (is_early_checkin) {
                    auditDetails.early_checkin_amount = newEarlyCheckinAmount;
                    auditDetails.final_amount = newFinalAmount;
                }
                if (is_delayed_checkout) {
                    auditDetails.delayed_checkout_amount = newDelayedCheckoutAmount;
                    auditDetails.final_amount = newFinalAmount;
                }

                await AuditService.log({
                    property_id: rows[0].property_id,
                    event_id: bookingId,
                    table_name: "bookings",
                    event_type: "STATUS_CHANGE",
                    task_name: "Update Booking Status",
                    comments: auditCommentText,
                    details: JSON.stringify(auditDetails),
                    user_id: updatedBy
                });
            } catch { }

            return {
                message: "Booking status updated successfully",
                booking: updatedRows[0]
            };

        } catch (err) {
            await client.query("ROLLBACK");

            if (
                err?.code === "ROOM_NOT_AVAILABLE" ||
                err?.code === "INVALID_CHECKOUT" ||
                err?.code === "STATUS_TIME_REQUIRED" ||
                err?.code === "INVALID_STATUS_TIME"
            ) {
                throw err;
            }

            throw err;
        } finally {
            client.release();
        }
    }

    async getTodayInHouseBookingIdsByProperty(propertyId) {
        const query = `
            select id
            from public.bookings
            where property_id = $1
              and is_active = true
              and booking_status not in ('CANCELLED', 'NO_SHOW')
              and estimated_arrival < date_trunc('day', now()) + interval '1 day'
              and estimated_departure > date_trunc('day', now());
        `;

        const { rows } = await this.#DB.query(query, [propertyId]);
        return rows.map(r => r.id);
    }

    async getTodayInHouseRoomsByProperty(propertyId) {

        const query = `
            SELECT
                b.id AS booking_id,
                rr.room_no
            FROM public.bookings b

            JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND COALESCE(rd.is_cancelled, false) = false
                AND COALESCE(rd.is_changed, false) = false

            JOIN public.ref_rooms rr
                ON rr.id = rd.ref_room_id
                AND rr.is_active = true

            WHERE b.property_id = $1
            AND b.is_active = true
            AND b.booking_status = 'CHECKED_IN'

            /* Only live room statuses */
            AND rd.room_status IN ('BOOKED', 'CHECKED_IN')

            ORDER BY rr.room_no;
        `;

        const { rows } = await this.#DB.query(query, [propertyId]);

        return rows;
    }

    async getTodayOccupiedRoomsByProperty(propertyId) {

        const query = `
            SELECT
                b.id AS booking_id,
                rr.room_no
            FROM public.bookings b

            JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND COALESCE(rd.is_cancelled, false) = false
                AND COALESCE(rd.is_changed, false) = false

            JOIN public.ref_rooms rr
                ON rr.id = rd.ref_room_id
                AND rr.is_active = true

            WHERE b.property_id = $1
            AND b.is_active = true
            AND b.booking_status IN ('CHECKED_IN', 'CONFIRMED')
            AND b.estimated_arrival < date_trunc('day', now()) + interval '1 day'
            AND COALESCE(b.actual_departure, b.estimated_departure) > date_trunc('day', now())

            ORDER BY rr.room_no;
        `;

        const { rows } = await this.#DB.query(query, [propertyId]);

        return rows;
    }


    async exportBookings({
        propertyId,
        arrivalFrom,
        arrivalTo,
        departureFrom,
        departureTo,
        scope,
        status,
        search
    }) {
        const property_id = Number(propertyId)
        const today = new Date().toISOString()

        const conditions = [`b.property_id = $1`]
        const params = [property_id]
        let idx = 2

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^BO0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const bookingId = Number(rawId);
                conditions.push(`(
                    b.id = $${idx}
                    OR b.booking_type ILIKE $${idx + 1}
                    OR b.booking_status ILIKE $${idx + 1}
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_details rd_search
                        JOIN public.ref_rooms rr_search
                            ON rr_search.id = rd_search.ref_room_id
                        WHERE rd_search.booking_id = b.id
                            AND rr_search.room_no ILIKE $${idx + 1}
                    )
                )`)
                params.push(bookingId, `%${normalizedSearch}%`)
                idx += 2
            } else {
                conditions.push(`(
                    b.booking_type ILIKE $${idx}
                    OR b.booking_status ILIKE $${idx}
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_details rd_search
                        JOIN public.ref_rooms rr_search
                            ON rr_search.id = rd_search.ref_room_id
                        WHERE rd_search.booking_id = b.id
                            AND rr_search.room_no ILIKE $${idx}
                    )
                )`)
                params.push(`%${normalizedSearch}%`)
                idx++
            }
        }

        // --- Arrival Date Filter ---
        if (arrivalFrom && arrivalFrom.length === 10) {
            conditions.push(`b.estimated_arrival >= $${idx}`)
            params.push(`${arrivalFrom}T00:00:00.000Z`)
            idx++
        }
        if (arrivalTo && arrivalTo.length === 10) {
            conditions.push(`b.estimated_arrival <= $${idx}`)
            params.push(`${arrivalTo}T23:59:59.999Z`)
            idx++
        }

        // --- Departure Date Filter ---
        if (departureFrom && departureFrom.length === 10) {
            conditions.push(`b.estimated_departure >= $${idx}`)
            params.push(`${departureFrom}T00:00:00.000Z`)
            idx++
        }
        if (departureTo && departureTo.length === 10) {
            conditions.push(`b.estimated_departure <= $${idx}`)
            params.push(`${departureTo}T23:59:59.999Z`)
            idx++
        }

        if (status) {
            conditions.push(`b.booking_status = $${idx}`)
            params.push(status)
            idx++
        }

        if (scope === "upcoming" && !arrivalFrom && !arrivalTo && !departureFrom && !departureTo) {
            conditions.push(`b.actual_departure IS NULL`)
        } else if (scope === "past" && !arrivalFrom && !arrivalTo && !departureFrom && !departureTo) {
            conditions.push(`b.estimated_departure < $${idx}`)
            params.push(today)
            idx++
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`

        const { rows } = await this.#DB.query(
            `
            SELECT
                b.id,
                b.booking_status,
                b.booking_type,
                b.booking_date,
                b.estimated_arrival,
                b.estimated_departure,
                b.booking_nights,
                b.total_guest,
                b.final_amount,
                b.drop,
                b.pickup,

                COALESCE(
                    ARRAY_AGG(rr.room_no) FILTER (WHERE rr.room_no IS NOT NULL),
                    '{}'
                ) AS room_numbers

            FROM public.bookings b
            LEFT JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND COALESCE(rd.is_cancelled, false) = false
                AND COALESCE(rd.is_changed, false) = false

            LEFT JOIN public.ref_rooms rr
                ON rr.id = rd.ref_room_id

            ${whereClause}
            GROUP BY b.id
            ORDER BY b.booking_date ASC
            `
            ,
            params
        )

        return rows
    }

    async #getScopedBooking(bookingId, userId) {
        const { rows } = await this.#DB.query(
            `
            SELECT b.id, b.property_id
            FROM public.bookings b
            LEFT JOIN public.property_users pu
              ON pu.property_id = b.property_id
             AND pu.user_id = $2
             AND pu.is_active = true
            WHERE b.id = $1
            LIMIT 1
            `,
            [Number(bookingId), userId]
        );
        if (!rows.length) throw new Error("Booking not found");
        return rows[0];
    }

    async uploadGuestImage({ bookingId, userId, imageBuffer, imageMime }) {
        await this.#getScopedBooking(bookingId, userId);
        await this.#DB.query(
            `
            UPDATE public.bookings
            SET guest_image = $2,
                guest_image_mime = $3,
                updated_by = $4,
                updated_on = now()
            WHERE id = $1
            `,
            [Number(bookingId), imageBuffer, imageMime, userId]
        );
        return { message: "Guest image uploaded successfully" };
    }

    async getGuestImage({ bookingId, userId }) {
        await this.#getScopedBooking(bookingId, userId);
        const { rows } = await this.#DB.query(
            `
            SELECT guest_image, guest_image_mime
            FROM public.bookings
            WHERE id = $1
              AND guest_image IS NOT NULL
            `,
            [Number(bookingId)]
        );
        if (!rows.length) return null;
        return { buffer: rows[0].guest_image, mime: rows[0].guest_image_mime || "image/jpeg" };
    }

    async deleteGuestImage({ bookingId, userId }) {
        await this.#getScopedBooking(bookingId, userId);
        await this.#DB.query(
            `
            UPDATE public.bookings
            SET guest_image = NULL,
                guest_image_mime = NULL,
                updated_by = $2,
                updated_on = now()
            WHERE id = $1
            `,
            [Number(bookingId), userId]
        );
        return { message: "Guest image deleted successfully" };
    }
    async changeRoom({ bookingId, oldRooms, newRooms, reason, changedBy }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            /* 1. Lock Booking */
            const { rows: bookingRows } = await client.query(
                `
                SELECT id, property_id, booking_status, estimated_arrival, estimated_departure, actual_arrival, actual_departure
                FROM public.bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [Number(bookingId)]
            );

            if (!bookingRows.length) throw new Error("Booking not found");
            const booking = bookingRows[0];

            if (['CANCELLED', 'CHECKED_OUT'].includes(booking.booking_status)) {
                throw new Error(`Cannot change room for booking in ${booking.booking_status} status`);
            }

            /* 2. Get old active rooms for audit log */
            let oldRoomIds = [];
            if (oldRooms && Array.isArray(oldRooms) && oldRooms.length > 0) {
                oldRoomIds = oldRooms.map(r => r.ref_room_id || r.id || r);
            }

            if (oldRoomIds.length > 0 && oldRoomIds.length !== newRooms.length) {
                throw new Error(`Please select exactly ${oldRoomIds.length} replacement room(s) for the removed assigned room(s).`);
            }

            let oldRoomsQuery = `
                SELECT rd.ref_room_id, rr.room_no, rtr.ac_type_name, rtr.room_category_name, rtr.bed_type_name, rr.floor_number
                FROM public.room_details rd
                JOIN public.ref_rooms rr ON rr.id = rd.ref_room_id
                LEFT JOIN public.room_type_rates rtr ON rr.room_type_id = rtr.id
                WHERE rd.booking_id = $1
                  AND COALESCE(rd.is_cancelled, false) = false
                  AND COALESCE(rd.is_changed, false) = false
            `;
            const oldRoomsParams = [Number(bookingId)];

            if (oldRoomIds.length > 0) {
                oldRoomsQuery += ` AND rd.ref_room_id = ANY($2::bigint[])`;
                oldRoomsParams.push(oldRoomIds);
            }

            const { rows: fetchedOldRooms } = await client.query(oldRoomsQuery, oldRoomsParams);

            if (fetchedOldRooms.length === 0) {
                throw new Error("No active rooms found to change for this booking");
            }

            /* 3. Check conflicts for new rooms */
            const conflictArrival = booking.actual_arrival || booking.estimated_arrival;
            const conflictDeparture = booking.actual_departure || booking.estimated_departure;

            for (const room of newRooms) {
                const { rows: conflicts } = await client.query(
                    `
                    SELECT 
                        r.id AS room_id,
                        r.room_no,
                        rd2.booking_id AS active_booking_id,
                        b2.booking_status AS active_booking_status
                    FROM public.ref_rooms r 
                    LEFT JOIN public.room_details rd2
                        ON rd2.ref_room_id = r.id
                        AND rd2.booking_id != $1
                        AND COALESCE(rd2.is_cancelled, false) = false
                        AND COALESCE(rd2.is_changed, false) = false
                    LEFT JOIN public.bookings b2
                        ON b2.id = rd2.booking_id
                        AND b2.is_active = true
                        AND b2.booking_status IN ('CONFIRMED','CHECKED_IN')
                        AND b2.estimated_arrival < $3::timestamptz
                        AND COALESCE(b2.actual_departure, b2.estimated_departure) > $2::timestamptz
                    WHERE r.id = $4
                      AND b2.id IS NOT NULL
                    `,
                    [
                        bookingId,
                        conflictArrival,
                        conflictDeparture,
                        room.ref_room_id
                    ]
                );

                if (conflicts.length) {
                    throw {
                        code: "ROOM_NOT_AVAILABLE",
                        message: "One or more newly selected rooms are not available",
                        booking_id: bookingId,
                        conflicted_rooms: conflicts
                    };
                }
            }

            /* 4. Mark existing active rooms as changed */
            let updateQuery = `
                UPDATE public.room_details
                SET is_changed = true, updated_on = now(), updated_by = $2
                WHERE booking_id = $1
                  AND COALESCE(is_cancelled, false) = false
                  AND COALESCE(is_changed, false) = false
            `;
            const updateParams = [Number(bookingId), changedBy];

            if (oldRoomIds.length > 0) {
                updateQuery += ` AND ref_room_id = ANY($3::bigint[])`;
                updateParams.push(oldRoomIds);
            }

            await client.query(updateQuery, updateParams);

            /* 4b. Mark the old rooms as dirty in ref_rooms so they aren't instantly re-bookable */
            if (fetchedOldRooms.length > 0) {
                const fetchedIds = fetchedOldRooms.map(r => r.ref_room_id);
                await client.query(
                    `
                    UPDATE public.ref_rooms
                    SET dirty = true, updated_on = now(), updated_by = $1
                    WHERE id = ANY($2::bigint[])
                    `,
                    [changedBy, fetchedIds]
                );
            }

            /* 5. Insert new rooms */
            for (const room of newRooms) {
                await client.query(
                    `
                    INSERT INTO public.room_details (
                        booking_id,
                        ref_room_id,
                        room_type,
                        room_status,
                        is_cancelled,
                        is_changed,
                        created_by
                    )
                    VALUES ($1, $2, $3, 'BOOKED', false, false, $4)
                    `,
                    [
                        booking.id,
                        room.ref_room_id,
                        room.room_type || null,
                        changedBy
                    ]
                );
            }

            /* 6. Fetch new rooms full details for audit log */
            const newRoomIds = newRooms.map(r => r.ref_room_id);
            const { rows: newRoomsDetails } = await client.query(
                `
                SELECT rr.id as ref_room_id, rr.room_no, rtr.ac_type_name, rtr.room_category_name, rtr.bed_type_name, rr.floor_number
                FROM public.ref_rooms rr
                LEFT JOIN public.room_type_rates rtr ON rr.room_type_id = rtr.id
                WHERE rr.id = ANY($1::bigint[])
                `,
                [newRoomIds]
            );

            /* 7. Audit Log */
            try {
                await AuditService.log({
                    property_id: booking.property_id,
                    event_id: booking.id,
                    table_name: "bookings",
                    event_type: "ROOM_CHANGE",
                    task_name: "Room Changed",
                    comments: reason || "Room change requested",
                    details: JSON.stringify({
                        "Assigned Rooms": fetchedOldRooms.map(r => r.room_no).join(', '),
                        "Replaced Rooms": newRoomsDetails.map(r => r.room_no).join(', ')
                    }),
                    user_id: changedBy
                });
            } catch (err) {
                console.error("Audit log failed for room change:", err);
            }

            await client.query("COMMIT");

            return { message: "Room changed successfully" };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
}

export default Object.freeze(new Booking())


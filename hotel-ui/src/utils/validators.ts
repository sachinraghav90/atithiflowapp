const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// const phoneRegex = /^[0-9()]{10,15}$/;
const phoneRegex = /^[0-9()]{10,15}$/;

type FormError = {
    type: "required" | "invalid";
    message: string;
};

export const validateStaff = (
    staff: any,
    mode: "add" | "edit",
    staffIdProofExists: boolean | null,
    roles: any[],
    isSuperAdmin: boolean
) => {

    const errors: Record<string, FormError> = {};

    const selectedRoles = roles.filter((role) =>
        staff.role_ids?.includes(role.id)
    );

    const staffIsOwner = selectedRoles.some((x) => x.name === "OWNER");

    /* ================= BASIC INFO ================= */

    if (!staff.salutation?.trim())
        errors.salutation = { type: "required", message: "Salutation is required" };

    if (!staff.first_name?.trim())
        errors.first_name = { type: "required", message: "First name is required" };

    if (!staff.last_name?.trim())
        errors.last_name = { type: "required", message: "Last name is required" };

    if (!staff.email?.trim())
        errors.email = { type: "required", message: "Email is required" };
    else if (!emailRegex.test(staff.email))
        errors.email = { type: "invalid", message: "Invalid email address" };

    const phone1 = staff.phone1?.trim() || "";

    const parts = phone1.split(/\s+/);

    const phonePart1 = parts.slice(1).join("");

    // ---------- REQUIRED VALIDATION ----------

    if (!phonePart1) {
        errors.phone1 = {
            type: "required",
            message: "Phone is required"
        };
    }

    // ---------- FORMAT VALIDATION ----------

    else if (!phoneRegex.test(phonePart1)) {
        errors.phone1 = {
            type: "invalid",
            message: "Invalid Phone number"
        };
    }

    const phone2 = staff.phone2?.trim() || "";

    const parts2 = phone2.split(/\s+/);

    const phonePart2 = parts2.slice(1).join("");

    // ---------- REQUIRED VALIDATION ----------

    if (phonePart2 && !phoneRegex.test(phonePart2)) {
        errors.phone2 = {
            type: "invalid",
            message: "Invalid Phone number"
        };
    }


    if (staff.phone2?.trim() && staff.phone2.trim()?.split(" ")?.[1] && !phoneRegex.test(staff.phone2.split(" ")[1]))
        errors.phone2 = { type: "invalid", message: "Invalid phone number" };

    /* ================= ROLE BASED ================= */

    if (!staffIsOwner) {

        const emergency = staff.emergency_contact?.trim() || "";

        // split safely (handles multiple spaces)
        const parts = emergency.split(/\s+/);

        const phonePart = parts.slice(1).join("");

        // ---------- REQUIRED VALIDATION ----------

        if (!phonePart) {
            errors.emergency_contact = {
                type: "required",
                message: "Emergency phone is required"
            };
        }

        // ---------- FORMAT VALIDATION ----------

        else if (!phoneRegex.test(phonePart)) {
            errors.emergency_contact = {
                type: "invalid",
                message: "Invalid emergency contact number"
            };
        }


        if (!staff.emergency_contact_name?.trim())
            errors.emergency_contact_name = {
                type: "required",
                message: "Emergency contact name is required"
            };

        if (!staff.emergency_contact_relation?.trim())
            errors.emergency_contact_relation = {
                type: "required",
                message: "Emergency contact relation is required"
            };

        // if (staff.emergency_contact_2?.trim() && !phoneRegex.test(staff.emergency_contact_2))
        //     errors.emergency_contact_2 = {
        //         type: "invalid",
        //         message: "Invalid alternate emergency number"
        //     };

        const emergency_contact_2 = staff.emergency_contact_2?.trim() || "";

        const parts2 = emergency_contact_2.split(/\s+/);

        const phonePart2 = parts2.slice(1).join("");

        // ---------- REQUIRED VALIDATION ----------

        if (phonePart2 && !phoneRegex.test(phonePart2)) {
            errors.emergency_contact_2 = {
                type: "invalid",
                message: "Invalid Phone number"
            };
        }

        if (!staff.property_id?.trim())
            errors.property_id = {
                type: "required",
                message: "Property is required"
            };

        if (!staff.id_proof_type?.trim())
            errors.id_proof_type = {
                type: "required",
                message: "ID Proof Type is required"
            };

        if (!staff.id_number?.trim())
            errors.id_number = {
                type: "required",
                message: "ID Number is required"
            };

        if (mode === "add" && !staff.id_proof)
            errors.id_proof = {
                type: "required",
                message: "Please choose ID Proof"
            };

        if (mode === "edit" && !staff.id_proof && staffIdProofExists === false)
            errors.id_proof = {
                type: "required",
                message: "Please choose ID Proof"
            };

        if (!staff.hire_date?.trim())
            errors.hire_date = {
                type: "required",
                message: "Joining date is required"
            };

        if (!staff.dob?.trim())
            errors.dob = {
                type: "required",
                message: "Date of birth is required"
            };

        if (!staff.blood_group?.trim())
            errors.blood_group = {
                type: "required",
                message: "Blood group is required"
            };
    }

    /* ================= OWNER SPECIAL RULE ================= */

    if (staffIsOwner) {

        const ownerStartedEmergency =
            staff.emergency_contact_relation?.trim() ||
            staff.emergency_contact_name?.trim();

        if (ownerStartedEmergency && !staff.emergency_contact?.trim()) {
            errors.emergency_contact = {
                type: "required",
                message: "Emergency phone is required"
            };
        }
    }

    /* ================= EXTRA EMERGENCY VALIDATION ================= */

    // if (staff.emergency_contact_2 && !phoneRegex.test(staff.emergency_contact_2))
    //     errors.emergency_contact_2 = {
    //         type: "invalid",
    //         message: "Invalid alternate emergency number"
    //     };

    if (staff.emergency_contact && !staff.emergency_contact_relation?.trim())
        errors.emergency_contact_relation = {
            type: "required",
            message: "Emergency contact relation is required"
        };

    if (staff.emergency_contact && !staff.emergency_contact_name?.trim())
        errors.emergency_contact_name = {
            type: "required",
            message: "Emergency contact name is required"
        };

    // if (staff.emergency_contact_2 && !staff.emergency_contact_relation_2?.trim())
    //     errors.emergency_contact_relation_2 = {
    //         type: "required",
    //         message: "Emergency contact relation is required"
    //     };

    // if (staff.emergency_contact_2 && !staff.emergency_contact_name_2?.trim())
    //     errors.emergency_contact_name_2 = {
    //         type: "required",
    //         message: "Emergency contact name is required"
    //     };

    /* ================= NATIONALITY ================= */

    if (!staff.nationality?.trim())
        errors.nationality = {
            type: "required",
            message: "Nationality is required"
        };

    /* ================= FOREIGNER RULES ================= */

    if (staff.nationality === "foreigner") {

        if (!staff.country?.trim())
            errors.country = {
                type: "required",
                message: "Country is required"
            };

        if (!staff.visa_number?.trim())
            errors.visa_number = {
                type: "required",
                message: "Visa number is required"
            };

        if (!staff.visa_issue_date?.trim())
            errors.visa_issue_date = {
                type: "required",
                message: "Visa issue date is required"
            };

        if (!staff.visa_expiry_date?.trim())
            errors.visa_expiry_date = {
                type: "required",
                message: "Visa expiry date is required"
            };

        if (
            staff.visa_issue_date &&
            staff.visa_expiry_date &&
            new Date(staff.visa_expiry_date) <= new Date(staff.visa_issue_date)
        ) {
            errors.visa_expiry_date = {
                type: "invalid",
                message: "Visa expiry must be after issue date"
            };
        }
    }

    /* ================= PERSONAL INFO ================= */

    if (!staff.gender?.trim())
        errors.gender = { type: "required", message: "Gender is required" };

    if (!staff.marital_status?.trim())
        errors.marital_status = {
            type: "required",
            message: "Marital status is required"
        };

    /* ================= SYSTEM ================= */

    if (mode === "add" && !staff.password?.trim())
        errors.password = {
            type: "required",
            message: "Password is required"
        };

    if (mode === "add" && !staff.confirm_password?.trim())
        errors.confirm_password = {
            type: "required",
            message: "Confirm password is required"
        };

    if (mode === "add" && staff.password !== staff.confirm_password) {
        errors.confirm_password = {
            type: "invalid",
            message: "Passwords do not match"
        };
        errors.password = {
            type: "invalid",
            message: "Passwords do not match"
        };
    }

    if (!staff.property_id && !(isSuperAdmin || staffIsOwner))
        errors.property_id = {
            type: "required",
            message: "Property is required"
        };

    if (!staff.role_ids || staff.role_ids.length === 0)
        errors.role_ids = {
            type: "required",
            message: "Please select a role"
        };

    return errors;
};

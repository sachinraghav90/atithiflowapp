import PropertyIdentity from "./sections/PropertyIdentity";
import PropertyLocation from "./sections/PropertyLocation";
import PropertyConfiguration from "./sections/PropertyConfiguration";
import PropertyOperations from "./sections/PropertyOperations";
import PropertyBank from "./sections/PropertyBank";
import PropertyCorporate from "./sections/PropertyCorporate";
import PropertyTax from "./sections/PropertyTax";

type BankAccount = {
    id?: number;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    branch_address?: string;
};

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
    imagePreview?: string | null;
    setImagePreview?: (v: string | null) => void;
    selectedImageFile?: File | null;
    setSelectedImageFile?: (v: File | null) => void;
    imageError?: boolean;
    setImageError?: (v: boolean) => void;
    logoPreview?: string | null;
    setLogoPreview?: (v: string | null) => void;
    logoFile?: File | null;
    setLogoFile?: (v: File | null) => void;
    logoError?: boolean;
    setLogoError?: (v: boolean) => void;
    showOfficeFields?: boolean;
    setShowOfficeFields?: (v: boolean) => void;
    bankAccounts?: BankAccount[];
    setBankAccounts?: (fn: (prev: BankAccount[]) => BankAccount[]) => void;
    hasBankDetails?: boolean;
    setHasBankDetails?: (v: boolean) => void;
    deletedBankIds?: number[];
    setDeletedBankIds?: (fn: (prev: number[]) => number[]) => void;
};

const DEFAULT_BANK_ACCOUNT: BankAccount = {
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
};

export default function PropertyForm({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
    imagePreview = null,
    setImagePreview = () => undefined,
    selectedImageFile = null,
    setSelectedImageFile = () => undefined,
    imageError = false,
    setImageError = () => undefined,
    logoPreview = null,
    setLogoPreview = () => undefined,
    logoFile = null,
    setLogoFile = () => undefined,
    logoError = false,
    setLogoError = () => undefined,
    showOfficeFields = false,
    setShowOfficeFields = () => undefined,
    bankAccounts = [DEFAULT_BANK_ACCOUNT],
    setBankAccounts = () => undefined,
    hasBankDetails = false,
    setHasBankDetails = () => undefined,
    deletedBankIds = [],
    setDeletedBankIds = () => undefined,
}: Props) {
    return (
        <div className="space-y-6">
            <PropertyIdentity
                value={value}
                setValue={setValue}
                errors={errors}
                setErrors={setErrors}
                viewMode={viewMode}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                selectedImageFile={selectedImageFile}
                setSelectedImageFile={setSelectedImageFile}
                imageError={imageError}
                setImageError={setImageError}
                logoPreview={logoPreview}
                setLogoPreview={setLogoPreview}
                logoFile={logoFile}
                setLogoFile={setLogoFile}
                logoError={logoError}
                setLogoError={setLogoError}
            />

            <PropertyLocation {...{ value, setValue, errors, setErrors, viewMode }} />
            <PropertyTax {...{ value, setValue, errors, setErrors, viewMode }} />
            <PropertyConfiguration {...{ value, setValue, errors, setErrors, viewMode }} />
            <PropertyOperations {...{ value, setValue, errors, setErrors, viewMode }} />

            <PropertyBank
                bankAccounts={bankAccounts}
                setBankAccounts={setBankAccounts}
                hasBankDetails={hasBankDetails}
                setHasBankDetails={setHasBankDetails}
                deletedBankIds={deletedBankIds}
                setDeletedBankIds={setDeletedBankIds}
                errors={errors}
                setErrors={setErrors}
                viewMode={viewMode}
            />

            <PropertyCorporate
                value={value}
                setValue={setValue}
                showOfficeFields={showOfficeFields}
                setShowOfficeFields={setShowOfficeFields}
                errors={errors}
                setErrors={setErrors}
                viewMode={viewMode}
            />
        </div>
    );
}

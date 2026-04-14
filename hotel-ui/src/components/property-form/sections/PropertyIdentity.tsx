import { Label } from "@/components/ui/label";
import { Image as ImageIcon } from "lucide-react";
import FormInput from "@/components/forms/FormInput";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;

    imagePreview: string | null;
    setImagePreview: (v: string | null) => void;
    selectedImageFile: File | null;
    setSelectedImageFile: (v: File | null) => void;
    imageError: boolean;
    setImageError: (v: boolean) => void;

    logoPreview: string | null;
    setLogoPreview: (v: string | null) => void;
    logoFile: File | null;
    setLogoFile: (v: File | null) => void;
    logoError: boolean;
    setLogoError: (v: boolean) => void;
};

export default function PropertyIdentity({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,

    imagePreview,
    setImagePreview,
    selectedImageFile,
    setSelectedImageFile,
    imageError,
    setImageError,

    logoPreview,
    setLogoPreview,
    logoFile,
    setLogoFile,
    logoError,
    setLogoError,
}: Props) {

    return (
        <div className="border border-border rounded-[5px] p-5 bg-card">

            <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">

                {/* ================= LEFT SIDE ================= */}
                <div className="flex flex-col gap-4">

                    <h3 className="font-semibold text-base">
                        Property Identity
                    </h3>

                    <FormInput
                        label="Property Name"
                        field="brand_name"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={150}
                    />

                </div>

                {/* ================= RIGHT MEDIA ================= */}
                <div className="flex gap-3 h-full">

                    {/* IMAGE */}
                    <MediaSquare
                        label="Photo"
                        preview={imagePreview}
                        fallback={!imageError && value.id
                            ? `${import.meta.env.VITE_API_URL}/properties/${value.id}/image`
                            : null}
                        viewMode={viewMode}
                        onError={() => setImageError(true)}
                        onFile={(file) => {
                            setSelectedImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                            setImageError(false);
                        }}
                        objectFit="cover"
                    />

                    {/* LOGO */}
                    <MediaSquare
                        label="Logo"
                        preview={logoPreview}
                        fallback={!logoError && value.id
                            ? `${import.meta.env.VITE_API_URL}/properties/${value.id}/logo`
                            : null}
                        viewMode={viewMode}
                        onError={() => setLogoError(true)}
                        onFile={(file) => {
                            setLogoFile(file);
                            setLogoPreview(URL.createObjectURL(file));
                            setLogoError(false);
                        }}
                        objectFit="contain"
                    />

                </div>

            </div>

        </div>
    );
}

function MediaSquare({
    label,
    preview,
    fallback,
    viewMode,
    onFile,
    onError,
    objectFit = "cover",
}: any) {

    const src = preview || fallback;

    return (
        <div className="space-y-1">

            <Label className="text-xs">{label}</Label>

            <div className="relative w-28 aspect-square rounded-[3px] border border-border overflow-hidden">

                {src ? (
                    <img
                        src={src}
                        className={`absolute inset-0 w-full h-full object-${objectFit}`}
                        onError={onError}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted text-center">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <span className="text-[10px]">Upload</span>
                    </div>
                )}

                {!viewMode && (
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            onFile(file);
                        }}
                    />
                )}

            </div>

        </div>
    );
}

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FormInput from "@/components/forms/FormInput";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
    mode: "add" | "edit" | "view";

    idProofMode: "select" | "other";
    setIdProofMode: (v: "select" | "other") => void;

    staffIdProofExists: boolean | null;

    downloadImage: (url: string, filename?: string) => void;
};

export default function IdentificationDocuments({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
    mode,
    idProofMode,
    setIdProofMode,
    staffIdProofExists,
    downloadImage,
}: Props) {

    const updateField = (field: string, val: any) => {

        setValue((prev: any) => ({
            ...prev,
            [field]: val,
        }));

        setErrors((p: any) => ({
            ...p,
            [field]: "",
        }));
    };

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent">

            <h3 className="font-semibold text-base">
                Identification & Documents
            </h3>

            {/* ================= ID TYPE + NUMBER ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* ID TYPE */}

                <div className="space-y-2">

                    <Label>ID Proof Type*</Label>

                    <NativeSelect
                        disabled={viewMode}
                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                        value={idProofMode === "other" ? "Other" : value.id_proof_type}
                        onChange={(e) => {

                            const selected = e.target.value;

                            if (selected === "Other") {
                                setIdProofMode("other");
                                updateField("id_proof_type", "");
                            } else {
                                setIdProofMode("select");
                                updateField("id_proof_type", selected);
                            }
                        }}
                    >
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Apaar ID">Apaar ID</option>
                        <option value="Passport ID">Passport ID</option>
                        <option value="Other">Other</option>
                    </NativeSelect>

                </div>

                {/* ID NUMBER */}

                <FormInput
                    label="ID Number"
                    field="id_number"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                    maxLength={100}
                />

            </div>

            {/* OTHER ID TYPE */}

            {idProofMode === "other" && (

                <FormInput
                    label="Specify ID Proof"
                    field="id_proof_type"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                    maxLength={50}
                />

            )}

            {/* ================= EXISTING ID PROOF (EDIT MODE) ================= */}

            {mode === "edit" && value.id ? (

                staffIdProofExists ? (

                    <div className="space-y-2">

                        <Label>ID Proof</Label>

                        <div className="relative h-48 rounded-[3px] border border-border overflow-hidden bg-muted">

                            <img
                                src={`${import.meta.env.VITE_API_URL}/staff/${value.id}/id-proof`}
                                className="w-full h-full object-contain bg-black/5"
                            />

                            <div className="absolute top-2 right-2 z-10">

                                <button
                                    className="text-xs bg-background border px-2 py-1 rounded"
                                    onClick={() =>
                                        downloadImage(
                                            `${import.meta.env.VITE_API_URL}/staff/${value.id}/id-proof`,
                                            `staff-${value.first_name}-${value.id}-id-proof.jpg`
                                        )
                                    }
                                >
                                    Download
                                </button>

                            </div>

                        </div>

                    </div>

                ) : (
                    <p className="text-sm text-muted-foreground">
                        No ID proof uploaded
                    </p>
                )

            ) : (

                <p className="text-sm text-muted-foreground">
                    No ID proof uploaded
                </p>

            )}

            {/* ================= UPLOAD ================= */}

            {!viewMode && (

                <Input
                    type="file"
                    onChange={(e) =>
                        setValue((prev: any) => ({
                            ...prev,
                            id_proof: e.target.files?.[0],
                        }))
                    }
                    className={errors.id_proof ? "border-red-500" : ""}
                />

            )}

        </div>
    );
}


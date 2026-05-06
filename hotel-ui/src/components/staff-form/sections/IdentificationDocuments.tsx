import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { cn } from "@/lib/utils";

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
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Identification & Documents
            </h3>

            {/* ================= ID TYPE + NUMBER ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                {/* ID TYPE */}
                <FormSelect
                    label="ID Proof Type"
                    field="id_proof_type"
                    value={{ id_proof_type: idProofMode === "other" ? "Other" : value.id_proof_type }}
                    setValue={(fn: any) => {
                        const updated = fn({ id_proof_type: idProofMode === "other" ? "Other" : value.id_proof_type });
                        const selected = updated.id_proof_type;

                        if (selected === "Other") {
                            setIdProofMode("other");
                            updateField("id_proof_type", "");
                        } else {
                            setIdProofMode("select");
                            updateField("id_proof_type", selected);
                        }
                    }}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="PAN">PAN</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Apaar ID">Apaar ID</option>
                    <option value="Passport ID">Passport ID</option>
                    <option value="Other">Other</option>
                </FormSelect>

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

            <div className="space-y-2">
                <Label className="text-sm">ID Proof</Label>
                
                {mode === "edit" && value.id ? (
                    staffIdProofExists ? (
                        <div className="relative h-48 rounded-[3px] border border-border/70 overflow-hidden bg-muted/30">
                            <img
                                src={`${import.meta.env.VITE_API_URL}/staff/${value.id}/id-proof`}
                                className="w-full h-full object-contain bg-black/5"
                            />
                            <div className="absolute top-2 right-2 z-10">
                                <button
                                    className="text-[10px] uppercase tracking-wider font-bold bg-background/90 hover:bg-background border px-3 py-1.5 rounded shadow-sm transition-colors"
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
                    ) : (
                        <div className="p-4 rounded-[3px] border border-dashed border-border bg-muted/10 text-center">
                            <p className="text-xs text-muted-foreground">No ID proof uploaded</p>
                        </div>
                    )
                ) : (
                    <div className="p-4 rounded-[3px] border border-dashed border-border bg-muted/10 text-center">
                        <p className="text-xs text-muted-foreground">No ID proof uploaded</p>
                    </div>
                )}
            </div>

            {/* ================= UPLOAD ================= */}

            {!viewMode && (
                <div className="space-y-1">
                    <Input
                        type="file"
                        onChange={(e) =>
                            setValue((prev: any) => ({
                                ...prev,
                                id_proof: e.target.files?.[0],
                            }))
                        }
                        className={cn(
                            "h-11 rounded-[3px] border-border/70 bg-background text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-bold file:bg-background file:text-muted-foreground hover:file:bg-accent",
                            errors.id_proof && "border-red-500"
                        )}
                    />
                    <p className="text-[10px] text-muted-foreground">Upload JPG or PNG. Max size 2MB.</p>
                </div>
            )}

        </div>
    );
}

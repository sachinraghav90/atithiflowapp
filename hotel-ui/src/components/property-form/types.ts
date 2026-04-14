// types.ts

export type FormMode = "add" | "edit";

export type ViewMode = boolean;

export type FieldError = {
    type: "required" | "invalid";
    message: string;
};

export type FormErrors = Record<string, FieldError>;

export interface PropertyFormProps {
    value: any;
    setValue: (val: any) => void;
    errors: FormErrors;
    setErrors: (fn: (prev: FormErrors) => FormErrors) => void;
    viewMode: ViewMode;
}

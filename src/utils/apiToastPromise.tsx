import { toast } from "react-toastify";
import { extractApiErrorMessage } from "./apiError";

export const apiToast = (promise: Promise<any>, successMsg: string) =>
    toast.promise(
        promise.catch(err => {
            throw new Error(extractApiErrorMessage(err));
        }),
        {
            pending: "Please wait...",
            success: successMsg,
            error: {
                render({ data }) {
                    return (data as Error).message;
                }
            }
        }
    );

// import { Loader2 } from "lucide-react";

// export function LogoSpinner() {
//     return (
//         <div className="relative flex h-16 w-16 items-center justify-center">
//             {/* Spinner */}
//             <Loader2 className="absolute h-16 w-16 animate-spin text-primary" />

//             {/* Logo */}
//             <img
//                 src="src\assets\atithiflow-logo.png"
//                 alt="Company Logo"
//                 className="h-8 w-8 object-contain"
//             />
//         </div>
//     );
// }

import { motion } from "framer-motion";

export function LogoSpinner() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="relative flex h-16 w-16 items-center justify-center">
                <motion.div
                    className="h-16 w-16 rounded-full border-4 border-muted border-t-primary"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />

                <motion.img
                    src="src\assets\atithiflow-logo.png"
                    alt="Company Logo"
                    className="absolute h-8 w-8"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                />
            </div>
        </div>
    );
}


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
import atithiflowLogo from "@/assets/atithiflow-logo.png";

export function LogoSpinner() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative flex h-24 w-24 items-center justify-center">
                {/* Outer glowing ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-[3px] border-primary/20"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
                
                {/* Spinning gradient ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/50"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />

                {/* Logo with slight pulse */}
                <motion.img
                    src={atithiflowLogo}
                    alt="AtithiFlow Logo"
                    className="absolute h-10 w-auto object-contain"
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
            </div>
            
            <motion.div 
                className="mt-6 text-sm font-medium text-muted-foreground tracking-widest uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
                Loading...
            </motion.div>
        </div>
    );
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function sanitizeFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeFirestore(v)).filter(v => v !== undefined);
    }
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
            newObj[key] = sanitizeFirestore(val);
        }
    });
    return newObj;
}

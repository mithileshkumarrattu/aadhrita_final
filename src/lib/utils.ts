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

export const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch (e) {
            console.warn(`[safeStorage] Access Denied for getItem: ${key}`);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[safeStorage] Access Denied for setItem: ${key}`);
        }
    },
    removeItem: (key: string): void => {
        try {
            if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        } catch (e) {
            console.warn(`[safeStorage] Access Denied for removeItem: ${key}`);
        }
    }
};

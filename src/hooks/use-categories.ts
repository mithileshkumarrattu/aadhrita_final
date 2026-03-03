import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

export interface Category {
    id: string;
    label: string;
    description: string;
    image: string;
}

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>(EVENT_CATEGORIES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time listener for category updates
        const unsubscribe = onSnapshot(doc(db, 'settings', 'categories'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().order) {
                setCategories(docSnap.data().order);
            } else {
                // If no custom order exists, we stick with default but could initialize it here
                // For now, just use local constant as fallback
                setCategories(EVENT_CATEGORIES);
            }
            setLoading(false);
        }, (err) => {
            console.error("Failed to fetch categories:", err);
            toast.error("Failed to load category settings");
            setCategories(EVENT_CATEGORIES);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateCategories = async (newOrder: Category[]) => {
        try {
            await setDoc(doc(db, 'settings', 'categories'), { order: newOrder }, { merge: true });
            toast.success("Category order updated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save order");
            throw error;
        }
    };

    return { categories, loading, updateCategories };
}

'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { doc, setDoc } from 'firebase/firestore';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Seeder() {
    const [loading, setLoading] = useState(false);

    const seedCategories = async () => {
        setLoading(true);
        try {
            for (const cat of EVENT_CATEGORIES) {
                // Use label as ID or the existing ID? existing ID is safer.
                await setDoc(doc(db, 'event_categories', cat.id), cat);
            }
            toast.success("Categories Seeded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to seed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border border-yellow-500 bg-yellow-50/10 rounded-xl mb-8">
            <h3 className="font-bold text-yellow-500 mb-2">Developer Tools</h3>
            <Button onClick={seedCategories} disabled={loading} variant="outline" className="border-yellow-500 text-yellow-500">
                {loading ? "Seeding..." : "Seed Categories to DB"}
            </Button>
            <p className="text-xs text-neutral-400 mt-2">Run this once to populate Firestore with initial categories so you can edit them later.</p>
        </div>
    );
}

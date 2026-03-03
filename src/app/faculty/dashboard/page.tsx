'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getStaffSession } from '@/lib/staff-auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FacultyDashboardRedirect() {
    const router = useRouter();

    React.useEffect(() => {
        const checkAuth = async () => {
            const session = getStaffSession();

            if (!session || session.role !== 'coordinator') {
                router.replace('/faculty');
                return;
            }

            if (session.assignedEventId) {
                // Direct access to assigned event
                router.replace(`/faculty/event/${session.assignedEventId}`);
            } else {
                // Edge case: Coordinator with no event
                toast.error("No event assigned to this ID.");
            }
        };

        checkAuth();
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
    );
}

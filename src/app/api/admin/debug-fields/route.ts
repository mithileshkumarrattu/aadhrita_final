import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    const results: any = {
        eventsWithFields: [],
        marvelTeamDoc: {},
        sparkTeamDoc: {},
        ideathonCustomFields: []
    };

    try {
        const eventsSnap = await adminDb.collection('events').get();
        eventsSnap.forEach(doc => {
            const data = doc.data();
            const customs = data.formConfig?.customFields || [];
            if (customs.length > 0) {
                results.eventsWithFields.push({
                    id: doc.id,
                    title: data.title,
                    fields: customs.map((f: any) => ({ label: f.label, id: f.id }))
                });
            }
            if (doc.id === 'ideathon') {
                results.ideathonCustomFields = customs;
            }
        });

        const marvelDoc = await adminDb.collection('teams').doc('TEAM_MARVEL__9578').get();
        results.marvelTeamDoc = {
            exists: marvelDoc.exists,
            data: marvelDoc.exists ? marvelDoc.data() : null
        };

        const sparkDoc = await adminDb.collection('teams').doc('SPARK_SQUAD_6717').get();
        results.sparkTeamDoc = {
            exists: sparkDoc.exists,
            data: sparkDoc.exists ? sparkDoc.data() : null
        };

        return NextResponse.json(results);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

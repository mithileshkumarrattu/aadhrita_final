import { adminDb } from "./src/lib/firebase-admin";

async function checkIssues() {
    const snap = await adminDb.collection("payment_issues").orderBy("createdAt", "desc").limit(100).get();
    const issues = snap.docs.map(d => d.data()).filter(d => d.type === "HACKATHON_TEAM_NOT_FOUND");
    console.log("Found:", issues.length);
    issues.slice(0, 3).forEach(issue => console.log(JSON.stringify(issue, null, 2)));
}

checkIssues().catch(console.error);

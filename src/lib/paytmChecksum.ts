import PaytmChecksum from "paytmchecksum";

/**
 * body: must be a JSON string of params
 * key: merchant key string from env
 */
export async function generateSignature(body: string, key: string) {
    // Ensure we are passing strings
    const strBody = typeof body === 'string' ? body : JSON.stringify(body);
    return PaytmChecksum.generateSignature(strBody, key);
}

export async function verifySignature(
    body: any,
    key: string,
    checksum: string
) {
    return PaytmChecksum.verifySignature(body, key, checksum);
}

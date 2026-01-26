declare module 'paytmchecksum' {
    export class PaytmChecksum {
        static generateSignature(params: string | object, key: string): Promise<string>;
        static verifySignature(params: string | object, key: string, checksum: string): Promise<boolean>;
        static encrypt(params: string, key: string): Promise<string>;
        static decrypt(params: string, key: string): Promise<string>;
    }
    export default PaytmChecksum;
}

declare module 'selfsigned' {
    // Certificate object containing pems
    export interface ICertificate {
        readonly private: string,
        readonly public: string,
        readonly cert: string
    }

    // Attribute object with key/value for each certificate attribute
    export interface IAttribute {
        readonly name: string,
        readonly value: string
    }

    /**
     * Options to use when generating the certificate
     */
    export interface IOptions {
        readonly days: number,
        readonly [name: string]: any
    }

    /**
     * Generate a self-signed certificate.
     * @param attributes An array of attribute objects
     * @param options An options object
     * @param callback An optional callback to provide if execution should be asynchronous
     * @returns An ICertificate object if synchronous, undefined if asynchronous
     */
    export function generate(
        attributes: IAttribute[],
        options: IOptions,
        callback?: (err: Error, cert: ICertificate) => void
    ): ICertificate | undefined
}

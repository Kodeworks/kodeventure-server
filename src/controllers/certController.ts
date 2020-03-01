import { Request, Response } from 'express'
import { generate, IAttribute, ICertificate, IOptions } from 'selfsigned'

import { Log } from '../logging'

export class CertController {

    public async createPlayerCert(req: Request, res: Response) {
        const ip = req.connection.remoteAddress

        try {
            const pems = await this.generateCertificate(ip)
            res.send(pems)
        } catch (e) {
            Log.error(`Failed to generate certificate for ${ip}: ${e.message}`, 'cert')

            res.status(500)
            res.send({ status: 500, error: e.message })
        }
    }

    /**
     * Generate a self-signed certificate
     * @param ip The IP address to create the certificate for
     */
    private async generateCertificate(ip: string): Promise<ICertificate> {
        Log.info(`Generating certificate for ${ip}`, 'cert')

        const attributes: IAttribute[] = [{ name: 'commonName', value: ip }]
        const options: IOptions = { days: 31 }

        return generate(attributes, options)
    }

}
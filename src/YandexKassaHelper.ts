import uuid from 'uuid';
import axios, {AxiosRequestConfig} from 'axios';

interface YandexKassaHelperConfig {
    shopId: string,
    password: string
}

class YandexKassaHelper {
    private config: YandexKassaHelperConfig;

    constructor({yandexKassaConfig}: { yandexKassaConfig: YandexKassaHelperConfig }) {
        this.config = yandexKassaConfig;
    }

    get dependencies() {
        return [
            'yandexKassaConfig'
        ];
    }

    /**
     * Sends request to Yandex.Kassa and re-sends it if required in reply.
     * @param request Request object for the axios library.
     * @param delay Milliseconds to wait before request. Default 0.
     * @returns {Promise<any>}
     */
    async sendRequest(request: AxiosRequestConfig, delay = 0) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let response = await axios(request);
                    if (response.status === 202) {
                        try {
                            let retryResponse = await this.sendRequest(request, response.data.retry_after);
                            return resolve(retryResponse);
                        } catch (error) {
                            return reject(error);
                        }
                    }
                    resolve(response.data);
                } catch (error) {
                    reject(error.response.data);
                }
            }, delay);
        });
    }

    /**
     * Registers payment at Yandex.Kassa service.
     * @param userId User identifier.
     * @param amount Amount to pay.
     * @param returnUrl Return url.
     * @param metadata Metadata object.
     * @returns {Promise<YandexKassaPayment>} Returns payment object.
     */
    async createPayment(userId: string, amount: number, returnUrl: string, metadata: object) {
        const idempotenceKey = uuid.v4();
        const request = {
            url: 'https://payment.yandex.net/api/v3/payments',
            method: 'POST',
            responseType: 'json',
            headers: {
                'Idempotence-Key': idempotenceKey,
                'Content-Type': 'application/json',
            },
            auth: {
                username: this.config.shopId,
                password: this.config.password
            },
            data: {
                amount: {
                    value: amount,
                    currency: "RUB"
                },
                metadata: {
                    userId,
                    idempotenceKey,
                    ...metadata
                },
                confirmation: {
                    type: "redirect",
                    return_url: returnUrl
                },
                description: `Пополнение баланса на ${amount} рублей.`
            }
        };
        return await this.sendRequest(request);
    }

    /**
     * Reads payment from Yandex.Kassa service.
     * @param paymentId Payment identifier.
     * @returns {Promise<any>}
     */
    async readPayment(paymentId: string) {
        const request = {
            url: `https://payment.yandex.net/api/v3/payments/${paymentId}`,
            method: 'GET',
            responseType: 'json',
            headers: {
                'Content-Type': 'application/json',
            },
            auth: {
                username: this.config.shopId,
                password: this.config.password
            },
        };
        return await this.sendRequest(request);
    }

    /**
     * Update payment as captures at Yandex.Kassa service.
     * @param paymentId Payment unique identifier.
     * @returns {Promise<any>}
     */
    async capturePayment(paymentId: string) {
        const request = {
            url: `https://payment.yandex.net/api/v3/payments/${paymentId}/capture`,
            method: 'POST',
            responseType: 'json',
            headers: {
                'Idempotence-Key': uuid.v4(),
                'Content-Type': 'application/json',
            },
            auth: {
                username: this.config.shopId,
                password: this.config.password
            },
        };
        return await this.sendRequest(request);
    }
}

export default YandexKassaHelper;

import axios from 'axios';
import env from '@app/common/config/env';

class ReCaptcha {
    private url: string;

    constructor() {
        this.url = `https://www.google.com/recaptcha/api/siteverify`
    }

    /**
     * 
     * @param token 
     * @returns {Object} verified recaptcha value
     */
    async verifyReCaptchaToken(token: string) {
        const { data } = await axios.post(
            `${this.url}?secret=${env.secret_key_recaptcha}`,
            {
                params: {
                    secret: env.secret_key_recaptcha,
                    response: token
                }
            }
        )
        return data
    }
}

export default new ReCaptcha()

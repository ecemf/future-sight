import { IAuthenticationBackend } from "../interfaces/IAuthenticationBackend ";
import fetch from 'node-fetch';

// TODO handle errors
// TODO add refresh token into try/catch
// TODO See Decorator design pattern
// getData -> refresh -> and getData (2 fois)
export default class IIASAAuthenticationBackend implements IAuthenticationBackend {

    public config;

    constructor(config) {
        this.config = config;
    }

    getConfig = () => this.config;

    initializeToken = async () => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: this.config.username,
                password: this.config.password
            })
        };

        const response = await fetch(this.config.auth_url, options);
        const data = await response.json();

        const err: any = new Error();

        switch (response.status) {
            case 200:
                process.env["access_token"] = data.access;
                process.env["refresh_token"] = data.refresh;
                break;
            case 401:
                err.message = response.statusText + ": " + data.detail
                err.status = 401;
                throw err;
            default:
                err.message = response.statusText + ": connexion error!";
                err.status = 401;
                throw err;
        }
    };

    refreshToken = async () => {
        if (process.env["refresh_token"] != null) {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh: process.env["refresh_token"]
                })
            };

            const response = await fetch(this.config.refresh_token_url, options);
            const data = await response.json();
            if (response.status == 200) {
                process.env["access_token"] = data.access;
                return true;
            }
        }
        // If refresh token is expired --> auth required
        // For the first request -> process.env["refresh_token"] == null
        await this.initializeToken();
        return true;

    };

}

// Access token
/**
 {
    "message": "The supplied token is expired or invalid.",
    "kwargs": {},
    "error_name": "invalid_token"
}
 */
// refresh token

/*
{
    "detail": "Token is invalid or expired",
    "code": "token_not_valid"
}
*/
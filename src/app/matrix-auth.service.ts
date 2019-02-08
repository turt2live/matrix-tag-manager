import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { stripTail } from "./http.util";
import { BehaviorSubject, MonoTypeOperatorFunction, Observable, OperatorFunction } from "rxjs";
import { catchError } from "rxjs/operators";

export interface MatrixLoginResponse {
    user_id: string;
    access_token: string;
    device_id: string;
}

export interface MatrixUser {
    isLoggedIn: boolean;
    userId: string;
    accessToken: string;
    hsUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class MatrixAuthService {

    private loginState$: BehaviorSubject<MatrixUser> = new BehaviorSubject<MatrixUser>({
        isLoggedIn: false,
        userId: null,
        accessToken: null,
        hsUrl: null,
    });

    public get loginState(): Observable<MatrixUser> {
        return this.loginState$.asObservable();
    }

    constructor(private http: HttpClient) {
        const storedUserId = localStorage.getItem("mx_user_id");
        const storedAccessToken = localStorage.getItem("mx_access_token");
        const storedHsUrl = localStorage.getItem("mx_homeserver_url");

        if (storedUserId && storedAccessToken && storedHsUrl) {
            this.loginState$.next({
                isLoggedIn: true,
                userId: storedUserId,
                accessToken: storedAccessToken,
                hsUrl: storedHsUrl,
            });
        }

        this.loginState$.subscribe(state => {
            if (state.userId) localStorage.setItem("mx_user_id", state.userId);
            if (state.accessToken) localStorage.setItem("mx_access_token", state.accessToken);
            if (state.hsUrl) localStorage.setItem("mx_homeserver_url", state.hsUrl);
        });
    }

    public login(hsUrl: string, username: string, password: string): Observable<MatrixLoginResponse> {
        hsUrl = stripTail(hsUrl);

        const obs = this.http.post<MatrixLoginResponse>(`${hsUrl}/_matrix/client/r0/login`, {
            type: "m.login.password",
            identifier: {
                type: "m.id.user",
                user: username,
            },
            password: password,
            initial_device_display_name: "matrix-tag-manager",
        });

        obs.subscribe(r => {
            this.loginState$.next({
                isLoggedIn: true,
                userId: r.user_id,
                accessToken: r.access_token,
                hsUrl: hsUrl,
            });
        });

        return obs;
    }

    public logout() {
        localStorage.clear();
        this.http.post(`${this.loginState$.value.hsUrl}/_matrix/client/r0/logout`, {}, {
            headers: {
                "Authorization": `Bearer ${this.loginState$.value.accessToken}`,
            },
        });
        this.loginState$.next({
            isLoggedIn: false,
            userId: null,
            accessToken: null,
            hsUrl: null,
        })
    }

    public logoutIfUnauthorized<T>(): MonoTypeOperatorFunction<T> {
        return catchError<T>(e => {
            if (e.status === 401) {
                this.logout();
            }
            throw e;
        });
    }
}

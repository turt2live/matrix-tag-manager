import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { stripTail } from "./http.util";
import { BehaviorSubject, Observable } from "rxjs";

export interface MatrixLoginResponse {
    user_id: string;
    access_token: string;
    device_id: string;
}

export interface MatrixUser {
    isLoggedIn: boolean;
    userId: string;
    accessToken: string;
}

@Injectable({
    providedIn: 'root'
})
export class MatrixAuthService {

    private mtxUser: BehaviorSubject<MatrixUser> = new BehaviorSubject<MatrixUser>({
        isLoggedIn: false,
        userId: null,
        accessToken: null,
    });

    public get loginState(): Observable<MatrixUser> {
        return this.mtxUser.asObservable();
    }

    constructor(private http: HttpClient) {
        const storedUserId = localStorage.getItem("mx_user_id");
        const storedAccessToken = localStorage.getItem("mx_access_token");

        if (storedUserId && storedAccessToken) {
            this.mtxUser.next({
                isLoggedIn: true,
                userId: storedUserId,
                accessToken: storedAccessToken,
            });
        }

        this.mtxUser.subscribe(state => {
            localStorage.setItem("mx_user_id", state.userId);
            localStorage.setItem("mx_access_token", state.accessToken);
        });
    }

    public login(hsUrl: string, username: string, password: string): Observable<MatrixLoginResponse> {
        const obs = this.http.post<MatrixLoginResponse>(`${stripTail(hsUrl)}/_matrix/client/r0/login`, {
            type: "m.login.password",
            identifier: {
                type: "m.id.user",
                user: username,
            },
            password: password,
            initial_device_display_name: "matrix-tag-manager",
        });

        obs.subscribe(r => {
            this.mtxUser.next({
                isLoggedIn: true,
                userId: r.user_id,
                accessToken: r.access_token,
            });
        });

        return obs;
    }
}

import { Injectable } from '@angular/core';
import { MatrixAuthService } from "./matrix-auth.service";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
    providedIn: 'root'
})
export class MatrixRoomsService {

    private homeserverUrl: string;
    private accessToken: string;

    constructor(private auth: MatrixAuthService, private http: HttpClient) {
        this.auth.loginState.subscribe(loginState => {
            this.homeserverUrl = loginState.hsUrl;
            this.accessToken = loginState.accessToken;
        });
    }

    public getJoinedRooms(): Observable<string[]> {
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/joined_rooms`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(map(r => r["joined_rooms"]));
    }
}

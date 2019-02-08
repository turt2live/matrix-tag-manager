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
        }).pipe(map(r => r["joined_rooms"], this.auth.logoutIfUnauthorized()));
    }

    public getStateEvent(roomId: string, eventType: string, stateKey: string): Observable<any> {
        roomId = encodeURIComponent(roomId);
        eventType = encodeURIComponent(eventType);
        stateKey = encodeURIComponent(stateKey);
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/rooms/${roomId}/state/${eventType}/${stateKey}`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized());
    }
}

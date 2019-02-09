import { Injectable } from '@angular/core';
import { MatrixAuthService } from "./matrix-auth.service";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { MatrixRoom } from "./matrix-room";

export interface IRoomTags {
    [tagName: string]: { order: number, roomId: string }[];
}

export interface IRooms {
    [roomId: string]: MatrixRoom;
}

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

    public getRooms(): Observable<IRooms> {
        const filter = {
            presence: {types: [], limit: 0},
            account_data: {types: [], limit: 0},
            room: {
                ephemeral: {types: [], limit: 0},
                state: {types: ['m.room.name', 'm.room.avatar']},
                timeline: {types: [], limit: 0},
                account_data: {types: [], limit: 0},
            },
        };
        const encodedFilter = encodeURIComponent(JSON.stringify(filter));
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/sync?filter=${encodedFilter}`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized(), map(r => {
            if (!r['rooms'] || !r['rooms']['join']) return {};

            const rooms = {};

            const joinedRooms = r['rooms']['join'];
            for (const roomId of Object.keys(joinedRooms)) {
                const room = joinedRooms[roomId];
                if (!room['state'] || !room['state']['events']) return;

                let displayName: string = null;
                let avatarMxc: string = null;
                for (const event of room['state']['events']) {
                    if (event['type'] === 'm.room.name' && event['content']) {
                        displayName = event['content']['name'];
                    }
                    if (event['type'] === 'm.room.avatar' && event['content']) {
                        avatarMxc = event['content']['url'];
                    }
                }

                rooms[roomId] = {displayName, avatarMxc, roomId};
            }

            return rooms;
        }));
    }

    public getTags(): Observable<IRoomTags> {
        const filter = {
            event_fields: ['content.tags'],
            presence: {types: [], limit: 0},
            account_data: {types: [], limit: 0},
            room: {
                ephemeral: {types: [], limit: 0},
                state: {types: [], limit: 0},
                timeline: {types: [], limit: 0},
                account_data: {types: ['m.tag']},
            },
        };
        const encodedFilter = encodeURIComponent(JSON.stringify(filter));
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/sync?filter=${encodedFilter}`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized(), map(r => {
            if (!r['rooms'] || !r['rooms']['join']) return {};

            const resultingTags = {};

            const joinedRooms = r['rooms']['join'];
            for (const roomId of Object.keys(joinedRooms)) {
                const accountData = joinedRooms[roomId]['account_data'];
                if (!accountData || !accountData['events']) continue;
                for (const event of accountData['events']) {
                    if (event['type'] !== 'm.tag') continue;

                    const content = event['content'];
                    if (!content || !content['tags']) continue;

                    for (const tagName of Object.keys(content['tags'])) {
                        const tag = content['tags'][tagName];
                        if (!resultingTags[tagName]) resultingTags[tagName] = [];
                        resultingTags[tagName].push({order: tag['order'] || 1, roomId: roomId});
                    }
                }
            }

            // Sort the tags by order
            for (const tagName of Object.keys(resultingTags)) {
                resultingTags[tagName].sort((a, b) => b.order - a.order);
            }

            return resultingTags;
        }));
    }
}

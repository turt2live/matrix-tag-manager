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

export interface IDirectChats {
    [userId: string]: string[];
}

export interface ITaggedRoom {
    [tagName: string]: { order: number };
}

@Injectable({
    providedIn: 'root'
})
export class MatrixRoomsService {

    private homeserverUrl: string;
    private accessToken: string;
    private userId: string;

    constructor(private auth: MatrixAuthService, private http: HttpClient) {
        this.auth.loginState.subscribe(loginState => {
            this.homeserverUrl = loginState.hsUrl;
            this.accessToken = loginState.accessToken;
            this.userId = loginState.userId;
        });
    }

    public getTagsOnRoom(roomId: string): Observable<ITaggedRoom> {
        const userId = encodeURIComponent(this.userId);
        roomId = encodeURIComponent(roomId);
        return this.http.get<IDirectChats>(`${this.homeserverUrl}/_matrix/client/r0/user/${userId}/rooms/${roomId}/tags`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized(), map(r => r['tags'] || {}));
    }

    public addTagToRoom(roomId: string, tagName: string, order: number): Observable<any> {
        const userId = encodeURIComponent(this.userId);
        roomId = encodeURIComponent(roomId);
        tagName = encodeURIComponent(tagName);
        return this.http.put(`${this.homeserverUrl}/_matrix/client/r0/user/${userId}/rooms/${roomId}/tags/${tagName}`, {
            order: order,
        }, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        });
    }

    public removeTagFromRoom(roomId: string, tagName: string): Observable<any> {
        const userId = encodeURIComponent(this.userId);
        roomId = encodeURIComponent(roomId);
        tagName = encodeURIComponent(tagName);
        return this.http.delete(`${this.homeserverUrl}/_matrix/client/r0/user/${userId}/rooms/${roomId}/tags/${tagName}`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        });
    }

    public getDirectChats(): Observable<IDirectChats> {
        const userId = encodeURIComponent(this.userId);
        return this.http.get<IDirectChats>(`${this.homeserverUrl}/_matrix/client/r0/user/${userId}/account_data/m.direct`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized());
    }

    public setDirectChats(chats: IDirectChats): Observable<any> {
        const userId = encodeURIComponent(this.userId);
        return this.http.put(`${this.homeserverUrl}/_matrix/client/r0/user/${userId}/account_data/m.direct`, chats, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized());
    }

    public getJoinedRooms(): Observable<string[]> {
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/joined_rooms`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized(), map(r => {
            return r['joined_rooms'] || [];
        }));
    }

    public getEffectiveJoinedMembers(roomId: string): Observable<string[]> {
        roomId = encodeURIComponent(roomId);
        return this.http.get(`${this.homeserverUrl}/_matrix/client/r0/rooms/${roomId}/members`, {
            params: {
                not_membership: ['leave', 'ban'],
            },
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        }).pipe(this.auth.logoutIfUnauthorized(), map(r => {
            if (!r['chunk']) return [];
            return r['chunk'].map(e => e['state_key']).filter(u => !!u);
        }));
    }

    /** Returns all rooms that are named */
    public getRooms(): Observable<IRooms> {
        const filter = {
            presence: {types: [], limit: 0},
            account_data: {types: [], limit: 0},
            room: {
                ephemeral: {types: [], limit: 0},
                state: {
                    // See
                    // https://matrix.org/docs/spec/client_server/r0.6.1#lazy-loading-room-members
                    // This only loads members in the timeline, not guaranteed to load all members
                    lazy_load_members: true,
                    types: ['m.room.name', 'm.room.avatar']
                },
                timeline: {types: [], limit: 0},
                account_data: {types: [], limit: 0},
            },
        };
        const encodedFilter = encodeURIComponent(JSON.stringify(filter));

        // see https://matrix.org/docs/spec/client_server/r0.6.1#filtering
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
                /** List of joined members */
                let joinedMembers: {avatar_url: string, displayname: string}[] = [];
                for (const event of room['state']['events']) {
                    if (event['type'] === 'm.room.name' && event['content']) {
                        displayName = event['content']['name'];
                    }
                    if (event['type'] === 'm.room.avatar' && event['content']) {
                        avatarMxc = event['content']['url'];
                    }
                    if (event['type'] === 'm.room.member' && event['content']
                        && event['content']['membership'] === 'join') {
                        const {avatar_url, displayname}  = event['content'];
                        joinedMembers.push({avatar_url, displayname});
                    }
                }

                // If our room doesn't have a name...
                if(displayName === null) {
                    // ...and we have one joined member in the room (eg. in the case of an account
                    // migration when direct messages become rooms, but no room name)...
                    if(joinedMembers.length === 1) {
                        // ...then treat the joined member name as the display name
                        // (just for our display, doesn't actually set the room name)
                        displayName = `Unnamed (${joinedMembers[0].displayname})`;
                        avatarMxc = joinedMembers[0].avatar_url;
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
                        const order = !tag['order'] && tag['order'] !== 0 ? 1 : Number(tag['order']);
                        resultingTags[tagName].push({order: order, roomId: roomId});
                    }
                }
            }

            // Sort the tags by order
            for (const tagName of Object.keys(resultingTags)) {
                resultingTags[tagName].sort((a, b) => a.order - b.order);
            }

            return resultingTags;
        }));
    }
}

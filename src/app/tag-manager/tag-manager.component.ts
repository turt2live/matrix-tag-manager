import { Component, OnInit } from '@angular/core';
import { MatrixAuthService } from "../matrix-auth.service";
import { MatrixRoomsService } from "../matrix-rooms.service";
import { MatrixRoom } from "../matrix-room";

@Component({
    selector: 'app-tag-manager',
    templateUrl: './tag-manager.component.html',
    styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent implements OnInit {

    public userId: string;
    public loadingRooms = true;
    public newTagName: string;

    public tags: { [tagName: string]: MatrixRoom[] } = {
        "Favourites": [],
        "Default": [],
        "Low Priority": [],
    };

    public get tagNames(): string[] {
        return Object.keys(this.tags);
    }

    constructor(private auth: MatrixAuthService, private rooms: MatrixRoomsService) {
    }

    public ngOnInit() {
        this.auth.loginState.subscribe(loginState => {
            this.userId = loginState.userId;
        });
        this.rooms.getRooms().subscribe(joinedRooms => {
            this.loadingRooms = false;

            this.rooms.getTags().subscribe(tags => {
                const sortedRoomIds = [];
                for (const tagName of Object.keys(tags)) {
                    let adjustedTagName = tagName;
                    if (tagName === "m.favourite") adjustedTagName = "Favourites";
                    if (tagName === "m.lowpriority") adjustedTagName = "Low Priority";

                    if (!this.tags[adjustedTagName]) this.tags[adjustedTagName] = [];
                    tags[tagName].map(taggedRoom => {
                        let room = joinedRooms[taggedRoom.roomId];
                        if (!room) room = {displayName: null, avatarMxc: null, roomId: taggedRoom.roomId};
                        this.tags[adjustedTagName].push(room);
                        sortedRoomIds.push(taggedRoom.roomId);
                    });
                }

                Object.keys(joinedRooms).filter(rid => !sortedRoomIds.includes(rid)).map(rid => {
                    const room = joinedRooms[rid];
                    this.tags["Default"].push(room);
                });
            });
        });
    }

    public logout() {
        this.auth.logout();
    }

    public setTaggedRooms(tagName, roomIds) {
        console.log("Set " + tagName + " to : " + JSON.stringify(roomIds));
    }

    public addTag() {
        this.tags[this.newTagName] = [];
        this.newTagName = "";
    }
}

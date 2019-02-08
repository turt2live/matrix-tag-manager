import { Component, OnInit } from '@angular/core';
import { MatrixAuthService } from "../matrix-auth.service";
import { MatrixRoomsService } from "../matrix-rooms.service";

@Component({
    selector: 'app-tag-manager',
    templateUrl: './tag-manager.component.html',
    styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent implements OnInit {

    public userId: string;
    public loadingRooms = true;
    public newTagName: string;

    public tags: { [tagName: string]: string[] } = {
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
        this.rooms.getJoinedRooms().subscribe(joinedRooms => {
            this.loadingRooms = false;

            this.rooms.getTags().subscribe(tags => {
                const sortedRooms = [];
                for (const tagName of Object.keys(tags)) {
                    let adjustedTagName = tagName;
                    if (tagName === "m.favourite") adjustedTagName = "Favourites";
                    if (tagName === "m.lowpriority") adjustedTagName = "Low Priority";

                    if (!this.tags[adjustedTagName]) this.tags[adjustedTagName] = [];
                    tags[tagName].map(room => {
                        this.tags[adjustedTagName].push(room.roomId);
                        sortedRooms.push(room.roomId);
                    });
                }
                joinedRooms.filter(rid => !sortedRooms.includes(rid)).map(rid => {
                    this.tags["Default"].push(rid);
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

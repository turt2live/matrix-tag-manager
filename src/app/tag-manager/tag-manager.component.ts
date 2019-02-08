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
    public joinedRooms: string[] = [];
    public newTagName: string;

    public tags: { [tagName: string]: string[] } = {
        "Default": [],
        "Test Tag": [],
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
            this.joinedRooms = joinedRooms;
            this.tags["Default"] = this.joinedRooms;
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

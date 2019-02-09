import { Component, Input, OnInit } from '@angular/core';
import { MatrixRoomsService } from "../matrix-rooms.service";
import { MatrixAuthService } from "../matrix-auth.service";
import { MatrixRoom } from "../matrix-room";

@Component({
    selector: 'app-room-tile',
    templateUrl: './room-tile.component.html',
    styleUrls: ['./room-tile.component.scss']
})
export class RoomTileComponent implements OnInit {

    @Input()
    public room: MatrixRoom;

    private homeserverUrl: string;

    public get displayName(): string {
        return this.room.displayName || this.room.roomId;
    }

    public get avatarUrl(): string {
        if (!this.room.avatarMxc || !this.homeserverUrl) return null;
        return `${this.homeserverUrl}/_matrix/media/r0/thumbnail/${this.room.avatarMxc.substring("mxc://".length)}?width=96&height=96&method=crop`;
    }

    constructor(private rooms: MatrixRoomsService, private auth: MatrixAuthService) {
    }

    public ngOnInit() {
        this.auth.loginState.subscribe(loginState => {
            this.homeserverUrl = loginState.hsUrl;
        });
    }

}

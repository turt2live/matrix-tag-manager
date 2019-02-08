import { Component, Input, OnInit } from '@angular/core';
import { MatrixRoomsService } from "../matrix-rooms.service";
import { MatrixAuthService } from "../matrix-auth.service";

@Component({
    selector: 'app-room-tile',
    templateUrl: './room-tile.component.html',
    styleUrls: ['./room-tile.component.scss']
})
export class RoomTileComponent implements OnInit {

    @Input()
    public roomId: string;

    public avatarUrl: string;
    public displayName: string;

    private homeserverUrl: string;

    constructor(private rooms: MatrixRoomsService, private auth: MatrixAuthService) {
    }

    public ngOnInit() {
        this.displayName = this.roomId;

        this.auth.loginState.subscribe(loginState => {
            this.homeserverUrl = loginState.hsUrl;
        });

        this.rooms.getStateEvent(this.roomId, "m.room.name", "").subscribe(ev => {
            this.displayName = ev['name'] || `Unamed room: ${this.roomId}`;
        });

        this.rooms.getStateEvent(this.roomId, "m.room.avatar", "").subscribe(ev => {
            if (!ev['url']) return;
            this.avatarUrl = `${this.homeserverUrl}/_matrix/media/r0/thumbnail/${ev['url'].substring("mxc://".length)}?width=96&height=96&method=crop`;
        });
    }

}

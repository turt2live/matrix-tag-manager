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

    constructor(private auth: MatrixAuthService, private rooms: MatrixRoomsService) {
    }

    public ngOnInit() {
        this.auth.loginState.subscribe(loginState => {
            this.userId = loginState.userId;
        });
        this.rooms.getJoinedRooms().subscribe(joinedRooms => {
            this.loadingRooms = false;
            this.joinedRooms = joinedRooms;
        });
    }

    public logout() {
        this.auth.logout();
    }
}

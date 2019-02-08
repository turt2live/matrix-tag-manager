import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-room-tile',
    templateUrl: './room-tile.component.html',
    styleUrls: ['./room-tile.component.scss']
})
export class RoomTileComponent implements OnInit {

    @Input()
    public roomId: string;

    constructor() {
    }

    public ngOnInit() {
    }

}

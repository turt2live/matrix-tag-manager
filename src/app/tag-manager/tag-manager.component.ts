import { Component, OnInit } from '@angular/core';
import { MatrixAuthService } from "../matrix-auth.service";

@Component({
    selector: 'app-tag-manager',
    templateUrl: './tag-manager.component.html',
    styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent implements OnInit {

    public userId: string;

    constructor(public auth: MatrixAuthService) {
    }

    public ngOnInit() {
        this.auth.loginState.subscribe(loginState => {
            this.userId = loginState.userId;
        });
    }

    public logout() {
        this.auth.logout();
    }
}

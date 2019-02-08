import { Component, OnInit } from '@angular/core';
import { MatrixAuthService } from "./matrix-auth.service";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
    public isLoggedIn = false;

    constructor(private auth: MatrixAuthService) {
    }

    public ngOnInit(): void {
        this.auth.loginState.subscribe(loginState => {
            this.isLoggedIn = loginState.isLoggedIn;
        });
    }
}

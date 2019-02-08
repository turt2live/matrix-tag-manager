import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { TagManagerComponent } from './tag-manager/tag-manager.component';
import { RoomTileComponent } from './room-tile/room-tile.component';
import { DragulaModule } from "ng2-dragula";

@NgModule({
    declarations: [
        AppComponent,
        LoginFormComponent,
        TagManagerComponent,
        RoomTileComponent,
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        FormsModule,
        DragulaModule.forRoot(),
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}

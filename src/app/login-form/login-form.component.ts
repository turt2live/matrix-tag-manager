import { Component } from '@angular/core';
import { MatrixAuthService } from "../matrix-auth.service";

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent {

  public homeserverUrl = "https://matrix.org";
  public username = "";
  public password = "";

  public loginError = "";
  public isLoggingIn = false;

  constructor(private auth: MatrixAuthService) { }

  public onLogin() {
    console.log("SUBMIT");
    this.isLoggingIn = true;
    this.loginError = "";
    this.auth.login(this.homeserverUrl, this.username, this.password).subscribe(r => {
      console.log(r);
    }, e => {
      if (e.error && e.error.error) {
        this.loginError = e.error.error;
      } else {
        this.loginError = "Error logging in";
      }
      this.isLoggingIn = false;
    });
  }

}

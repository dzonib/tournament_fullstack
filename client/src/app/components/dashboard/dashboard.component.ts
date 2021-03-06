import { Component, OnInit } from "@angular/core";
import { TeamsService } from "../../data/services/teams.service";
import { PlayersService } from "../../data/services/players.service";
import { Store } from "@ngrx/store";
import { GetAllPlayers, GetAllTeams, SetUser } from "../../data/stores/main-store";
import { State } from "../../data/stores/main-store/state";
import { Router } from "@angular/router";
import * as jwt_decode from "jwt-decode";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"]
})
export class DashboardComponent implements OnInit {
  constructor(
    private teamsService: TeamsService,
    private playersService: PlayersService,
    private store: Store<State>,
    private router: Router
  ) {}

  ngOnInit() {

  }

  getAllTeams() {
    // this.teamsService.getAllTeams().subscribe(teams => console.log(teams));
    this.store.dispatch(new GetAllTeams());
  }

  getAllPlayers() {
    //this.playersService.getAllPlayers().subscribe(players => console.log(players));
    this.store.dispatch(new GetAllPlayers());
  }

  linkToCreateTournamentForm() {
    this.router.navigate(["/create-tournament"]);
  }
}

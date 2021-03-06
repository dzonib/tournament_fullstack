import { Component, OnInit, OnDestroy, Inject } from "@angular/core";
import { Store } from "@ngrx/store";
import {
  GetAllMatches,
  GetAllMatchesSuccess
} from "../../data/stores/main-store";
import { State } from "../../data/stores/main-store/state";
import { ActivatedRoute, Params } from "@angular/router";
import { SubSink } from "subsink";
import { Match } from "src/app/data/models/match";
import { selectAllMatches } from "src/app/data/stores/main-store/selectors";

import {
  Validators,
  FormGroup,
  FormControl,
  FormBuilder
} from "@angular/forms";

import { MatTableDataSource } from "@angular/material/table";
import { SelectionModel } from "@angular/cdk/collections";
import { Observable } from "rxjs";
import { MatchService } from "src/app/data/services/match.service";
import {
  debounceTime,
  map,
  switchMap,
  tap,
  delay,
  throttleTime
} from "rxjs/operators";
import { TournamentService } from "src/app/data/services/tournament.service";
import { PHASE } from "src/app/data/models/util";
import {
  TournamentPhase,
  TournamentGraph
} from "src/app/data/models/tournament";
// import {
//   MatDialog,
//   MatDialogRef,
//   MAT_DIALOG_DATA
// } from "@angular/material/dialog";

@Component({
  selector: "app-tournament-graph",
  templateUrl: "./tournament-graph.component.html",
  styleUrls: ["./tournament-graph.component.css"]
})
export class TournamentGraphComponent implements OnInit, OnDestroy {
  disableFinishMatchBtn = true;
  public tournamentInProgress = [];
  private subs = new SubSink();
  tournamentId: number;
  matches: Match[] = [];
  matches2: Match[] = [];

  homeWinners = [];
  awayWinners = [];

  // NEW *******************
  phases: PHASE[] = [
    PHASE.FINALE,
    PHASE.SEMI_FINALS,
    PHASE.QUARTER_FINALS,
    PHASE.EIGHTH_FINALS,
    PHASE.SIXTEENTH_FINALS
  ];
  graphColumns: string[] = []; //phases in the tournament
  displayedGraphColumns: string[] = []; //phase names
  tournamentGraph: TournamentGraph[] = []; //we will have one graph but the table receives a array for the data source
  numberOfPhases: number = 0;

  winner: any;
  // ***********************

  // tournamentGraphGroup: FormGroup;
  dataSourceMatches = new MatTableDataSource<TournamentGraph>(
    this.tournamentGraph
  );
  // selectionForMatches = new SelectionModel<any>(true, []);

  phasesOfTournament: Set<string> = new Set();

  constructor(
    private store: Store<State>,
    private route: ActivatedRoute,
    private matchService: MatchService, // private _formBuilder: FormBuilder
    private tournamentService: TournamentService // public dialog: MatDialog
  ) {
    // this.tournamentGraphGroup = this._formBuilder.group({});
  }

  ngOnInit() {
    this.subs.sink = this.route.params.subscribe((params: Params) => {
      this.tournamentId = params.id;
    });
    //GET MATCHES
    setTimeout(() => {
      this.store.dispatch(new GetAllMatches(this.tournamentId));
    }, 2000);
    this.subs.sink = this.store.select(selectAllMatches).subscribe(data => {
      this.matches = data;

      //this.matches.forEach(x => console.log(x));
      console.log("Number of matches before if: " + this.matches.length);
      //this.dataSourceMatches = new MatTableDataSource<any>(this.matches);

      // NEW **************
      if (this.matches[0]) {
        //if there is no match it does not draw a graph
        let phaseCounter = 0;

        this.matches.forEach(match => {
          this.phasesOfTournament.add(match.phaseName);
        });
        // console.log("Number of phases: " + phasesOfTournament.size);
        //let phaseMatch = this.matches[0].phaseName;
        //console.log("Phase matches: " + phaseMatch);
        let isFinded = false;
        for (let i = this.phases.length; i >= 0; i--) {
          if (!isFinded) {
            for (let entry of this.phasesOfTournament) {
              // console.log(entry);
              if (entry === this.phases[i]) {
                isFinded = true;
              }
            }
          }
          //this.displayedGraphColumns.push(this.phases[i]);
          if (isFinded) {
            phaseCounter++;
            this.displayedGraphColumns.push(this.phases[i]);
            this.graphColumns.push(this.phases[i]);
          }
        }
        this.numberOfPhases = phaseCounter;
        let matchesArray: Match[] = [];
        let tournamentGraphLocal: TournamentGraph = new TournamentGraph();
        tournamentGraphLocal.tournamentPhases = [];

        for (let i = phaseCounter - 1; i >= 0; i--) {
          for (let j = 0; j < this.matches.length; j++) {
            if (this.matches[j].phaseName === this.phases[i]) {
              matchesArray.push(this.matches[j]);
              //console.log("Current phase:" + this.matches[j].phaseName);
            }
          }
          let tournamentPhase: TournamentPhase = new TournamentPhase();
          tournamentPhase.name = this.phases[i];
          // console.log("Name phase:" + tournamentPhase.name);
          tournamentPhase.matches = matchesArray.sort(
            (a, b) => a.drowPosition - b.drowPosition
          );
          console.log("Number of matches:" + tournamentPhase.matches.length);
          //console.log("Matches length before:" + matchesArray.length);
          tournamentGraphLocal.tournamentPhases.push(tournamentPhase);
          matchesArray = [];
          // console.log("Matches length:" + matchesArray.length);
        }
        this.tournamentGraph.push(tournamentGraphLocal);
        this.dataSourceMatches = new MatTableDataSource<TournamentGraph>(
          this.tournamentGraph
        );
      }
    });
  }

  resultIncrementHandler(
    matchWithNewResult: Match,
    homeOrGuest: "home" | "guest"
  ): void {
    this.disableFinishMatchBtn = false;
    for (let phase of this.tournamentGraph[0].tournamentPhases) {
      phase.matches = phase.matches.map(match => {
        if (match.id === matchWithNewResult.id && homeOrGuest === "home") {
          const updatedMatch = {
            ...match,
            scoreHome: matchWithNewResult.scoreHome + 1
          };

          this.saveScore(
            updatedMatch.idTournament,
            updatedMatch.id,
            updatedMatch.scoreHome,
            updatedMatch.scoreGuest
          );
          return updatedMatch;
        } else if (
          match.id === matchWithNewResult.id &&
          homeOrGuest === "guest"
        ) {
          const updatedMatch = {
            ...match,
            scoreGuest: matchWithNewResult.scoreGuest + 1
          };

          this.saveScore(
            updatedMatch.idTournament,
            updatedMatch.id,
            updatedMatch.scoreHome,
            updatedMatch.scoreGuest
          );
          return updatedMatch;
        } else {
          return match;
        }
      });
    }
  }

  resultSubtracthandler(
    matchWithNewResult: Match,
    homeOrGuest: "home" | "guest"
  ): void {
    this.disableFinishMatchBtn = false;
    for (let phase of this.tournamentGraph[0].tournamentPhases) {
      phase.matches = phase.matches.map(match => {
        if (
          match.id === matchWithNewResult.id &&
          homeOrGuest === "home" &&
          match.scoreHome !== 0
        ) {
          const updatedMatch = {
            ...match,
            scoreHome: matchWithNewResult.scoreHome - 1
          };

          this.saveScore(
            updatedMatch.idTournament,
            updatedMatch.id,
            updatedMatch.scoreHome,
            updatedMatch.scoreGuest
          );
          return updatedMatch;
        } else if (
          match.id === matchWithNewResult.id &&
          homeOrGuest === "guest" &&
          match.scoreGuest !== 0
        ) {
          const updatedMatch = {
            ...match,
            scoreGuest: matchWithNewResult.scoreGuest - 1
          };

          this.saveScore(
            updatedMatch.idTournament,
            updatedMatch.id,
            updatedMatch.scoreHome,
            updatedMatch.scoreGuest
          );
          return updatedMatch;
        } else {
          return match;
        }
      });
    }
  }

  finishMatchHandler(matchForFinish: Match, name) {
    console.log(matchForFinish);
    // this.awayWinners = [];
    // this.homeWinners = [];
    if (matchForFinish.scoreGuest > matchForFinish.scoreHome) {
      this.awayWinners.push(matchForFinish.guestUser.name);
    }
    if (matchForFinish.scoreGuest < matchForFinish.scoreHome) {
      this.homeWinners.push(matchForFinish.homeUser.name);
    }

    this.subs.sink = this.tournamentService
      .finishMatch(matchForFinish)
      .subscribe((data: Match) => {
        console.log("FINISH MATCH");
        console.log(data, "THIS AAAA");

        if (
          data[0].scoreHome > data[0].scoreGuest &&
          data[0].phaseName === "finale"
        ) {
          console.log("ASAAAAAA", data[0].phaseName);
          this.winner = data[0].homeUser;
        } else if (
          data[0].scoreHome < data[0].scoreGuest &&
          data[0].phaseName === "finale"
        ) {
          console.log("OMGGG", data[0].phaseName);
          this.winner = data[0].guestUser;
        }
        console.log("----------------------------------");
        // matchForFinish.deleted = data["deleted"];

        console.log(this.winner, "winner");
      });

    let currentPhase = matchForFinish.phaseName;
    console.log("Phase: " + currentPhase);
    let localTournamentPhase: TournamentPhase;
    let currentPhasePosition: number = 0;

    for (let i = 0; i < this.tournamentGraph[0].tournamentPhases.length; i++) {
      if (this.tournamentGraph[0].tournamentPhases[i].name === currentPhase) {
        currentPhasePosition = i;
        console.log("CURRENT PHASE POSITION OOOO: " + currentPhasePosition);
        this.tournamentGraph[0].tournamentPhases[i].matches.forEach(match => {
          if (matchForFinish.id === match.id) {
            match.deleted = true;
          }
        });
        break;
      }
    }
    let allMatchesCompleted = true;
    localTournamentPhase = this.tournamentGraph[0].tournamentPhases[
      currentPhasePosition
    ];
    this.tournamentGraph[0].tournamentPhases[
      currentPhasePosition
    ].matches.forEach(match => {
      if (!match.deleted) {
        allMatchesCompleted = false;
      }
    });
    console.log("All completed: " + allMatchesCompleted);
    console.log(
      "All completed phase: " +
        this.tournamentGraph[0].tournamentPhases[currentPhasePosition].name
    );
    if (
      allMatchesCompleted &&
      "finale" !==
        this.tournamentGraph[0].tournamentPhases[currentPhasePosition].name
    ) {
      let drawPosition = 1;
      let idHomeTeam;
      let idGuestTeam;
      let idHomeUser;
      let idGuestUser;
      localTournamentPhase.matches.sort(
        (a, b) => a.drowPosition - b.drowPosition
      );
      for (let i = 0; i < localTournamentPhase.matches.length; ) {
        if (
          //setting the match host in the next phase
          localTournamentPhase.matches[i].scoreHome >
          localTournamentPhase.matches[i].scoreGuest
        ) {
          idHomeTeam = localTournamentPhase.matches[i].idHomeTeam;
          idHomeUser = localTournamentPhase.matches[i].idHomeUser;
        } else {
          idHomeTeam = localTournamentPhase.matches[i].idGuestTeam;
          idHomeUser = localTournamentPhase.matches[i].idGuestUser;
        }
        if (
          //setting the match guest in the next phase
          localTournamentPhase.matches[i + 1].scoreHome >
          localTournamentPhase.matches[i + 1].scoreGuest
        ) {
          idGuestTeam = localTournamentPhase.matches[i + 1].idHomeTeam;
          idGuestUser = localTournamentPhase.matches[i + 1].idHomeUser;
        } else {
          idGuestTeam = localTournamentPhase.matches[i + 1].idGuestTeam;
          idGuestUser = localTournamentPhase.matches[i + 1].idGuestUser;
        }
        //currentPhasePosition++;
        console.log(
          this.tournamentGraph[0].tournamentPhases[0].name +
            "----" +
            this.tournamentGraph[0].tournamentPhases[1].name +
            "-----" +
            currentPhasePosition +
            1
        );
        let json = {
          scoreHome: 0,
          scoreGuest: 0,
          drowPosition: drawPosition,
          phaseName: this.tournamentGraph[0].tournamentPhases[
            currentPhasePosition + 1
          ].name,
          deleted: false,
          idHomeTeam: idHomeTeam,
          idGuestTeam: idGuestTeam,
          idTournament: localTournamentPhase.matches[i].idTournament,
          idHomeUser: idHomeUser,
          idGuestUser: idGuestUser
        };

        this.matchService.createMatch(json).subscribe(data => {
          console.log(data);
          this.matchService
            .getMatch(data.idTournament, data.id)
            .subscribe(data => {
              console.log(data);
              this.tournamentGraph[0].tournamentPhases[
                currentPhasePosition + 1
              ].matches.push(data);
              this.dataSourceMatches = new MatTableDataSource<TournamentGraph>(
                this.tournamentGraph
              );
            });
        });
        drawPosition++;
        i += 2; //taking matches in pairs
      }
    } else {
      let winnerText = "";
      for (let i = 0; i < localTournamentPhase.matches.length; i++) {
        if (
          //setting the match host in the next phase
          localTournamentPhase.matches[i].scoreHome >
          localTournamentPhase.matches[i].scoreGuest
        ) {
          winnerText +=
            localTournamentPhase.matches[i].idHomeUser +
            " - " +
            localTournamentPhase.matches[i].idHomeTeam;
        } else {
          winnerText +=
            localTournamentPhase.matches[i].idGuestUser +
            " - " +
            localTournamentPhase.matches[i].idGuestTeam;
        }
      }
      console.log(winnerText);
      // const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      //   width: "250px",
      //   data: winnerText
      // });

      // dialogRef.afterClosed().subscribe(result => {});
    }

    // { match.idTournament, match.id, match.scoreHome, match.scoreGuest }
    // do stuff on backend
    // if (this.matches2.length % 2 === 0) {
    //   if (match.scoreGuest > match.scoreHome) {
    //     this.matches2.push({
    //       id,
    //       guestUser: match.guestUser,
    //       guestTeam: match.guestTeam,
    //       scoreGuest: 0,
    //       drowPosition: 1,
    //       phaseName: "whatup",
    //       idTournament: this.matches[0].idTournament,
    //     });
    //     console.log(match);
    //     console.log("guest won");
    //   } else {
    //     console.log("home won");
    //   }
    // } else {
    //   this.matches2.push(match);
    //   console.log("crap2");
    // }
    // const winner = match.filter()
    // console.log(this.matches2);
  }

  saveScore(idTournament, idMatch, scoreHome, scoreGuest) {
    const yo$ = this.matchService.updateMatchScore(
      idTournament,
      idMatch,
      scoreHome,
      scoreGuest
    );
    this.subs.sink = yo$.subscribe(data => data);
  }

  // finishMatch(idTournament, idMatch, deleted) {
  //   const yo$ = this.matchService.updateMatchCompleted(
  //     idTournament,
  //     idMatch,
  //     deleted
  //   );
  //   this.subs.sink = yo$.subscribe(data => data);
  // }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}

// @Component({
//   selector: "dialog-overview-example-dialog",
//   template: `
//     <h1 mat-dialog-title>Winner of tournament</h1>
//     <div mat-dialog-content>
//       <p>data</p>
//     </div>
//     <div mat-dialog-actions>
//       <button mat-button (click)="onNoClick()">Close</button>
//     </div>
//   `
// })
// class DialogOverviewExampleDialog {
//   constructor(
//     public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
//     @Inject(MAT_DIALOG_DATA) public data: string
//   ) {}

//   onNoClick(): void {
//     this.dialogRef.close();
//   }
// }

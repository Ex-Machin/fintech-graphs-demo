import { CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './services/auth.service';
import { InstrumentService } from './services/instruments.service';
import { WebSocketService } from './services/ws.service';
import Chart from 'chart.js/auto';

interface Symbol {
  baseCurrency: string
  currency: string
  description: string
  id: string
  kind: string
  mappings: any,
  profile: any
  symbol: string
  tickSize: number
}

@Component({
  selector: 'app-root',
  imports: [MatButtonModule,  MatFormFieldModule, MatSelectModule, MatInputModule, FormsModule, CurrencyPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
  chart: any = []
  marketData: Symbol[] = [];

  constructor(
    private authService: AuthService,
    private instrumentService: InstrumentService,
    private wsService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.authService.getToken().subscribe(() => {
      this.instrumentService.getInstruments().subscribe((data) => {
        this.marketData = data.data

        this.wsService.connect("ws://localhost:8080")

        this.chart = new Chart('canvas', {
          type: 'line',
          data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [
              {
                label: '# of Votes',
                data: [12, 19, 3, 5, 2, 3],
                borderWidth: 1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      })

    })

  }

  selected: Symbol | null = null;

  onSelectionChange(event: any) {
    const found = this.marketData.find((symbol) => symbol.symbol == event.value);
    if (!found) {
      return
    }

    this.selected = found;
    this.wsService.sendMessage({
      "type": "l1-subscription",
      "id": "1",
      "instrumentId": this.selected.id,
      "provider": "simulation",
      "subscribe": true,
      "kinds": [
        "ask",
        "bid",
        "last"
      ]
    })

    this.wsService.messages$.subscribe((messages) => {
      console.log('message', messages);
    } )

  }

  ngOnDestroy() {
    this.wsService.closeConnection();
  }

  subscribe() {
    if (this.selected) {
      console.log(`Subscribed to ${this.selected.symbol}`);
    } else {
      console.log('Not Selected');

    }
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class InstrumentService {
    private apiUrl = '/api/proxy'; // Use the proxy path

    constructor(private http: HttpClient) { }

    getInstruments(): Observable<any> {
        const url = `${this.apiUrl}/instruments`;
        return this.http.get(url);
    }

    getProviders(): Observable<any> {
        const url = `${this.apiUrl}/providers`;
        return this.http.get(url);
    }
    
    getExchanges(): Observable<any> {
        const url = `${this.apiUrl}/exchanges`;
        return this.http.get(url);
    }
}

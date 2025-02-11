import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService  {
  private apiUrl = '/api/proxy/token';

  constructor(private http: HttpClient) {}

  getToken(): Observable<any> {
    return this.http.post(this.apiUrl, {});
  }
}

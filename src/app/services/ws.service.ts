import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WebSocketService {
    private socket: WebSocket | null = null;
    private messageSubject: Subject<string> = new Subject<string>(); // Emit strings instead of MessageEvent
    public messages$: Observable<string> = this.messageSubject.asObservable();

    constructor() { }

    public connect(url: string): void {
        if (this.socket) {
            console.warn('WebSocket is already connected.');
            return;
        }

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket connection established.');
        };

        this.socket.onmessage = (event: MessageEvent) => {
            if (event.data instanceof Blob) {
                // Convert Blob to string
                const reader = new FileReader();
                reader.onload = () => {
                    this.messageSubject.next(reader.result as string); // Emit the string
                };
                reader.readAsText(event.data); // Read the Blob as text
            } else {
                // If the data is already a string, emit it directly
                this.messageSubject.next(event.data);
            }
        };

        this.socket.onerror = (error: Event) => {
            console.error('WebSocket error:', error);
            this.messageSubject.error(error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection closed.');
            this.socket = null;
            this.messageSubject.complete();
        };
    }

    public sendMessage(message: string | object): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected.');
            return;
        }

        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        this.socket.send(payload);
    }

    public closeConnection(): void {
        if (this.socket) {
            this.socket.close();
        }
    }

    public isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }
}
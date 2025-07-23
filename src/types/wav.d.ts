declare module 'wav' {
  export class Writer {
    constructor(options?: any);
    write(data: any): void;
    end(): void;
  }
  
  export class Reader {
    constructor();
    on(event: string, callback: (data: any) => void): void;
  }
}
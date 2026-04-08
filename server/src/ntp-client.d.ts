declare module 'ntp-client' {
  interface NtpClient {
    getNetworkTime(
      server: string,
      port: number,
      callback: (err: Error | null, date: Date) => void
    ): void;
  }
  const ntpClient: NtpClient;
  export = ntpClient;
}

/**
 * Tink Bank Integration Client - STUB
 *
 * This is a typed stub for the Tink bank integration API.
 * To enable: set TINK_ENABLED=true and configure TINK_CLIENT_ID, TINK_CLIENT_SECRET.
 *
 * Real Tink integration requires:
 * 1. Register at https://console.tink.com
 * 2. Configure redirect URI
 * 3. Implement OAuth2 flow
 * 4. Handle consent/credential management
 */

import type { TinkAccount, TinkTransaction, TinkTokenResponse } from "@/types/bank";

const TINK_API_BASE = "https://api.tink.com";
const TINK_ENABLED = process.env.TINK_ENABLED === "true";

export class TinkClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.TINK_CLIENT_ID ?? "";
    this.clientSecret = process.env.TINK_CLIENT_SECRET ?? "";
    this.redirectUri = process.env.TINK_REDIRECT_URI ?? "";
  }

  isEnabled(): boolean {
    return TINK_ENABLED && !!this.clientId && !!this.clientSecret;
  }

  /**
   * Generate Tink authorization URL for user to connect their bank
   */
  getAuthorizationUrl(state: string): string {
    if (!this.isEnabled()) {
      throw new Error("Tink-integration är inte aktiverad");
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "accounts:read,transactions:read,credentials:read",
      market: "SE",
      locale: "sv_SE",
      state,
      test: process.env.NODE_ENV !== "production" ? "true" : "false",
    });

    return `https://link.tink.com/1.0/authorize/?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TinkTokenResponse> {
    if (!this.isEnabled()) {
      throw new Error("Tink-integration är inte aktiverad");
    }

    const response = await fetch(`${TINK_API_BASE}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tink token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TinkTokenResponse> {
    if (!this.isEnabled()) {
      throw new Error("Tink-integration är inte aktiverad");
    }

    const response = await fetch(`${TINK_API_BASE}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Kunde inte förnya Tink access token");
    }

    return response.json();
  }

  /**
   * Get user accounts
   */
  async getAccounts(accessToken: string): Promise<TinkAccount[]> {
    if (!this.isEnabled()) {
      return this.getMockAccounts();
    }

    const response = await fetch(`${TINK_API_BASE}/data/v2/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Kunde inte hämta bankkonton från Tink");
    }

    const data = await response.json() as { accounts: TinkAccount[] };
    return data.accounts ?? [];
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    options: { from?: string; to?: string; pageSize?: number } = {}
  ): Promise<TinkTransaction[]> {
    if (!this.isEnabled()) {
      return this.getMockTransactions(accountId);
    }

    const params = new URLSearchParams({
      accountIdIn: accountId,
      pageSize: String(options.pageSize ?? 100),
      ...(options.from && { bookedDateGte: options.from }),
      ...(options.to && { bookedDateLte: options.to }),
    });

    const response = await fetch(
      `${TINK_API_BASE}/data/v2/transactions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Kunde inte hämta transaktioner från Tink");
    }

    const data = await response.json() as { transactions: TinkTransaction[] };
    return data.transactions ?? [];
  }

  // ---- Mock data for development/demo ----
  private getMockAccounts(): TinkAccount[] {
    return [
      {
        id: "mock-account-1",
        name: "Företagskonto",
        type: "CHECKING",
        balance: {
          available: { amount: { value: "125000.00", currencyCode: "SEK" } },
          booked: { amount: { value: "125000.00", currencyCode: "SEK" } },
        },
        identifiers: {
          iban: { iban: "SE1234567890123456789012" },
        },
      },
    ];
  }

  private getMockTransactions(accountId: string): TinkTransaction[] {
    return [
      {
        id: "mock-tx-1",
        accountId,
        amount: { value: { unscaledValue: "-15000", scale: "2" }, currencyCode: "SEK" },
        dates: { booked: "2026-04-01", value: "2026-04-01" },
        descriptions: { original: "HYRA KONTOR APRIL", display: "Hyra kontor april" },
        merchantInformation: { merchantName: "Fastighets AB" },
        status: "BOOKED",
        types: { type: "PAYMENT" },
      },
      {
        id: "mock-tx-2",
        accountId,
        amount: { value: { unscaledValue: "50000", scale: "2" }, currencyCode: "SEK" },
        dates: { booked: "2026-04-02", value: "2026-04-02" },
        descriptions: { original: "KUNDINBETALNING FAK 2026001", display: "Kundinbetalning" },
        status: "BOOKED",
        types: { type: "TRANSFER" },
      },
      {
        id: "mock-tx-3",
        accountId,
        amount: { value: { unscaledValue: "-2500", scale: "2" }, currencyCode: "SEK" },
        dates: { booked: "2026-04-03", value: "2026-04-03" },
        descriptions: { original: "ICA MAXI", display: "ICA Maxi" },
        merchantInformation: { merchantName: "ICA Maxi", merchantCategoryCode: "5411" },
        status: "BOOKED",
        types: { type: "PAYMENT" },
      },
    ];
  }
}

export const tinkClient = new TinkClient();

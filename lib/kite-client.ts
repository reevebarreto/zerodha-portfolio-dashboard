const KiteConnect = require("kiteconnect").KiteConnect;
import { getSession } from "./db";

let kiteInstance: any = null;

export function getKiteClient(): any {
  if (!kiteInstance) {
    const apiKey = process.env.KITE_API_KEY;
    if (!apiKey) {
      throw new Error("KITE_API_KEY is not configured");
    }
    kiteInstance = new KiteConnect({ api_key: apiKey });
  }
  return kiteInstance;
}

export function getAuthenticatedKiteClient(): any {
  const kite = getKiteClient();
  const session = getSession();

  if (!session || !session.access_token) {
    throw new Error("Not authenticated. Please login first.");
  }

  kite.setAccessToken(session.access_token);
  return kite;
}

export function getLoginUrl(): string {
  const kite = getKiteClient();
  const redirectUrl = process.env.NEXTAUTH_URL + "/api/auth/callback";
  return kite.getLoginURL(redirectUrl);
}

export async function generateSession(requestToken: string): Promise<any> {
  const kite = getKiteClient();
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiSecret) {
    throw new Error("KITE_API_SECRET is not configured");
  }

  try {
    const response = await kite.generateSession(requestToken, apiSecret);
    return response;
  } catch (error: any) {
    console.error("Error generating session:", error);
    throw new Error(`Failed to generate session: ${error.message}`);
  }
}

export async function getProfile(): Promise<any> {
  const kite = getAuthenticatedKiteClient();
  try {
    return await kite.getProfile();
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }
}

export async function getHoldings(): Promise<any[]> {
  const kite = getAuthenticatedKiteClient();
  try {
    const holdings = await kite.getHoldings();
    return holdings;
  } catch (error: any) {
    console.error("Error fetching holdings:", error);
    throw new Error(`Failed to fetch holdings: ${error.message}`);
  }
}

export async function getPositions(): Promise<any> {
  const kite = getAuthenticatedKiteClient();
  try {
    return await kite.getPositions();
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }
}

export async function getMFHoldings(): Promise<any[]> {
  const kite = getAuthenticatedKiteClient();
  try {
    const holdings = await kite.getMFHoldings();
    return holdings;
  } catch (error: any) {
    console.error("Error fetching MF holdings:", error);
    throw new Error(`Failed to fetch MF holdings: ${error.message}`);
  }
}

export async function getMFSIPs(): Promise<any[]> {
  // Note: getMFSIPs is not available in the Kite Connect Node.js SDK
  // SIP data would need to be fetched through a different method or API
  // For now, returning empty array
  console.warn("getMFSIPs: SIP data not available through Kite Connect SDK");
  return [];
}

export async function getQuote(instruments: string[]): Promise<any> {
  const kite = getAuthenticatedKiteClient();
  try {
    return await kite.getQuote(instruments);
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    throw new Error(`Failed to fetch quotes: ${error.message}`);
  }
}

export async function getLTP(instruments: string[]): Promise<any> {
  const kite = getAuthenticatedKiteClient();
  try {
    return await kite.getLTP(instruments);
  } catch (error: any) {
    console.error("Error fetching LTP:", error);
    throw new Error(`Failed to fetch LTP: ${error.message}`);
  }
}

// Made with Bob

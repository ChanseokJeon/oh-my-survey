export async function getGoogleSheetsClient() {
  const { google } = await import("googleapis");

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
  }

  const parsedCredentials = JSON.parse(credentials);
  const googleAuth = new google.auth.GoogleAuth({
    credentials: parsedCredentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth: googleAuth });
}

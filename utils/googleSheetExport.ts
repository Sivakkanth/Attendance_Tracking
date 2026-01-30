// Utility to export data to Google Sheets using googleapis
// Requires service account credentials JSON in the project root as 'google-service-account.json'

import { google } from 'googleapis';

export async function exportToGoogleSheet({
  sheetTitle,
  headers,
  rows,
  spreadsheetId = null,
}: {
  sheetTitle: string;
  headers: string[];
  rows: (string | number)[][];
  spreadsheetId?: string | null;
}): Promise<{ url: string; spreadsheetId: string }> {
  // Load credentials
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  let sheetName = sheetTitle;
  let spreadsheet;
  if (!spreadsheetId) {
    // Create new spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: sheetTitle },
        sheets: [{ properties: { title: sheetName } }],
      },
    });
    spreadsheet = createRes.data;
    spreadsheetId = spreadsheet.spreadsheetId!;
  } else {
    // Check if a sheet with the same name exists, and delete it if so
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheetMeta.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    if (existingSheet && existingSheet.properties?.sheetId) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: existingSheet.properties.sheetId,
              },
            },
          ],
        },
      });
    }
    // Add a new sheet (tab) with the given name
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  }

  // Prepare data
  const values = [headers, ...rows];

  // Write data to the new sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId!,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return { url, spreadsheetId };
}

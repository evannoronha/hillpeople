/**
 * Mountain Project CSV Parser
 * Parses the tick export CSV format from Mountain Project
 */

export interface ParsedTick {
  date: string;
  route: string;
  rating: string;
  notes: string;
  url: string;
  pitches: number;
  location: string;
  avgStars: number;
  yourStars: number;
  style: string;
  leadStyle: string;
  routeType: string;
  yourRating: string;
  length: number;
  ratingCode: number;
}

/**
 * Parse CSV line handling quoted fields with commas and newlines
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Split CSV content into records, handling multi-line quoted fields
 */
function splitCSVRecords(csvText: string): string[] {
  const records: string[] = [];
  let currentRecord = '';
  let inQuotes = false;

  const lines = csvText.split('\n');

  for (const line of lines) {
    // Count unescaped quotes in the line
    let quoteCount = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (line[i + 1] === '"') {
          i++; // Skip escaped quote
        } else {
          quoteCount++;
        }
      }
    }

    if (currentRecord) {
      currentRecord += '\n' + line;
    } else {
      currentRecord = line;
    }

    // Toggle quote state
    if (quoteCount % 2 === 1) {
      inQuotes = !inQuotes;
    }

    // If we're not in quotes, this record is complete
    if (!inQuotes) {
      records.push(currentRecord);
      currentRecord = '';
    }
  }

  // Handle any remaining content
  if (currentRecord) {
    records.push(currentRecord);
  }

  return records;
}

/**
 * Parse Mountain Project CSV export into structured tick data
 */
export function parseCSV(csvText: string): ParsedTick[] {
  const records = splitCSVRecords(csvText);

  if (records.length < 2) {
    return [];
  }

  // Parse header
  const headerLine = records[0];
  const headers = parseCSVLine(headerLine);

  // Map header names to indices
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerIndex[h] = i;
  });

  // Parse data rows
  return records.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line);

      return {
        date: values[headerIndex['Date']] || '',
        route: values[headerIndex['Route']] || '',
        rating: values[headerIndex['Rating']] || '',
        notes: values[headerIndex['Notes']] || '',
        url: values[headerIndex['URL']] || '',
        pitches: parseInt(values[headerIndex['Pitches']]) || 1,
        location: values[headerIndex['Location']] || '',
        avgStars: parseFloat(values[headerIndex['Avg Stars']]) || 0,
        yourStars: parseInt(values[headerIndex['Your Stars']]) || -1,
        style: values[headerIndex['Style']] || '',
        leadStyle: values[headerIndex['Lead Style']] || '',
        routeType: values[headerIndex['Route Type']] || '',
        yourRating: values[headerIndex['Your Rating']] || '',
        length: parseInt(values[headerIndex['Length']]) || 0,
        ratingCode: parseInt(values[headerIndex['Rating Code']]) || 0,
      };
    })
    .filter(tick => tick.date && tick.url); // Must have date and URL
}

/**
 * Create a deterministic unique ID for a tick
 * Used for deduplication during sync.
 * Includes style to distinguish different ascent types of the same route on the same day.
 */
export function createTickId(personDocumentId: string, date: string, url: string, style?: string, leadStyle?: string, occurrence?: number): string {
  // Extract route ID from URL for a shorter, more stable ID
  const urlMatch = url.match(/\/route\/(\d+)\//);
  const routeId = urlMatch ? urlMatch[1] : url.replace(/[^a-zA-Z0-9]/g, '');
  const parts = [personDocumentId, date, routeId];
  const styleSuffix = [style, leadStyle].filter(Boolean).join('-');
  if (styleSuffix) parts.push(styleSuffix);
  if (occurrence && occurrence > 1) parts.push(String(occurrence));
  return parts.join('-');
}

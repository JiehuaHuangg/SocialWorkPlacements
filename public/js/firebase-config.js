
//Firebase configuration and data import script
const admin = require("firebase-admin");
const XLSX = require("xlsx");

// Predefined list of valid sectors from the 'Sectors' worksheet
const VALID_SECTORS = [
  "Aged Care / Gerontology",
  "AOD",
  "Child Protection / Families",
  // Add other valid sectors...
];

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Read Excel file using SheetJS library
const workbook = XLSX.readFile("SAMPE_DATA_TEST_ONLY.xlsx");

// Configuration mapping between Excel sheets and Firestore collections
const COLLECTION_MAP = {
  "FE1 students": "FE1_students",
  "FE2 students": "FE2_students",
  "Agency": "Agencies",
  "UWA Sessional Staff": "UWA_Sessional_Staff"
};

/**
 * Main processing function
 * Orchestrates data import workflow
 */
async function processData() {
  try {
    // Iterate through each configured worksheet
    for (const [sheetName, collectionName] of Object.entries(COLLECTION_MAP)) {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`\nProcessing ${sheetName} (${rawData.length} records)...`);

      // Process each record with error handling
      for (const [index, row] of rawData.entries()) {
        try {
          const processedRow = processRow(row, sheetName);
          await db.collection(collectionName).add(processedRow);
          console.log(`[${sheetName}] Record ${index + 1} added successfully`);
        } catch (error) {
          console.error(`[${sheetName}] Error at record ${index + 1}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

/**
 * Processes individual data rows with type conversions and validations
 * @param {Object} row - Raw data row from Excel
 * @param {string} sheetName - Source worksheet name
 * @returns {Object} Processed document ready for Firestore
 */
function processRow(row, sheetName) {
  const processed = { ...row };

  // Process semicolon-separated fields
  if (processed["Sector Exception"]) {
    processed.sector_exception = splitAndValidate(
      processed["Sector Exception"], 
      "Sector Exception",
      sheetName
    );
  }

  if (processed["Interested sectors"]) {
    processed.interested_sectors = splitAndValidate(
      processed["Interested sectors"],
      "Interested sectors",
      sheetName
    );
  }

  // Sheet-specific processing
  switch(sheetName) {
    case "Agency":
      // Convert numeric fields and boolean values
      processed.available_spots = Number(processed["Available spots"]) || 0;
      processed.has_onsite_supervisor = processed["Onsite SW Supervisor"] === "Yes";
      break;
    
    case "FE1 students":
    case "FE2 students":
      // Standardize driver's license field
      processed.drivers_licence = processed["Driver's Licence"] || "N/A";
      break;
  }

  return processed;
}

/**
 * Splits semicolon-separated values and validates against known sectors
 * @param {string} value - Raw input string
 * @param {string} fieldName - Field name for error reporting
 * @param {string} sheetName - Worksheet name for error reporting
 * @returns {Array} Validated array of values
 */
function splitAndValidate(value, fieldName, sheetName) {
  const items = value.split(/;\s*/);
  const invalidItems = [];

  // Sector-specific validation
  if (fieldName.includes("sector")) {
    items.forEach((item, index) => {
      if (!VALID_SECTORS.includes(item)) {
        invalidItems.push({ 
          item,
          suggestion: findClosestSector(item) 
        });
        // Preserve original value while logging issue
        items[index] = item;
      }
    });
  }

  // Log validation warnings
  if (invalidItems.length > 0) {
    console.warn(`[${sheetName}] Invalid entries in ${fieldName}:`);
    invalidItems.forEach(({ item, suggestion }) => {
      console.warn(` - "${item}" ${suggestion ? `(Did you mean "${suggestion}"?)` : ""}`);
    });
  }

  return items;
}

/**
 * Fuzzy matching for sector name suggestions
 * @param {string} input - Potentially misspelled sector name
 * @returns {string|null} Closest valid sector name match
 */
function findClosestSector(input) {
  // Normalize input for fuzzy matching
  const cleanInput = input.toLowerCase().replace(/[^a-z]/g, "");
  
  return VALID_SECTORS.find(sector => 
    sector.toLowerCase().replace(/[^a-z]/g, "").includes(cleanInput)
  );
}

// Execute data import process
processData().then(() => {
  console.log("\nData import completed");
  process.exit(0);
});
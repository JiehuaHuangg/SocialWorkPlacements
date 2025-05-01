const { processRow, splitAndValidate } = require('../importData');
const { mockFirestore } = require('firestore-jest-mock');

// Mock Firestore instance
mockFirestore({
  database: {
    FE1_students: [],
    Agencies: [],
  },
});

describe('Data Import Script Tests', () => {
  // Test 1: Basic field type conversions
  test('Converts numeric fields correctly', () => {
    const agencyRow = {
      'Available spots': '3', // String input
      'Onsite SW Supervisor': 'Yes',
    };
    const result = processRow(agencyRow, 'Agency');
    expect(result.available_spots).toBe(3);
    expect(typeof result.available_spots).toBe('number');
  });

  // Test 2: Array field processing
  test('Splits semicolon-separated fields into arrays', () => {
    const studentRow = {
      'Sector Exception': 'AOD; Mental Health / Counselling',
      'Interested sectors': 'Disability; Education',
    };
    const result = processRow(studentRow, 'FE1 students');
    expect(result.sector_exception).toEqual([
      'AOD',
      'Mental Health / Counselling',
    ]);
    expect(result.interested_sectors).toEqual(['Disability', 'Education']);
  });

  // Test 3: Boolean field conversion
  test('Converts Yes/No to boolean values', () => {
    const agencyRow = {
      'Onsite SW Supervisor': 'Yes',
      'Available spots': '2',
    };
    const result = processRow(agencyRow, 'Agency');
    expect(result.has_onsite_supervisor).toBe(true);

    const falseResult = processRow(
      { 'Onsite SW Supervisor': 'No' },
      'Agency'
    );
    expect(falseResult.has_onsite_supervisor).toBe(false);
  });

  // Test 4: Data validation and error reporting
  test('Flags invalid sector names', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    
    const row = {
      'Sector Exception': 'Invalid Sector; Child Protection / Fmailies',
    };
    
    const result = splitAndValidate(
      row['Sector Exception'],
      'Sector Exception',
      'FE1 students'
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid Sector')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Child Protection / Fmailies')
    );
  });

  // Test 5: Edge case handling
  test('Handles empty/missing values gracefully', () => {
    const emptyRow = {
      'Sector Exception': '',
      'Interested sectors': undefined,
    };
    
    const result = processRow(emptyRow, 'FE1 students');
    expect(result.sector_exception).toEqual([]);
    expect(result.interested_sectors).toBeUndefined();
  });

  // Test 6: Driver's license field standardization
  test('Standardizes driver license field', () => {
    const row1 = { 'Driver's Licence': 'Australian' };
    const result1 = processRow(row1, 'FE1 students');
    expect(result1.drivers_licence).toBe('Australian');

    const row2 = { 'Driver's Licence': undefined };
    const result2 = processRow(row2, 'FE1 students');
    expect(result2.drivers_licence).toBe('N/A');
  });
});
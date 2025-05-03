//UNIT TEST #1------how to run
//depentencies:
//using node:npm init -y
//install JEST: npm install --save-dev jest
//TO Run tests
//npm test


// utils.test.js unit tests
const { extractSuburb, determineRegion } = require('./app.js');//get the functions from app.js

// Test extractSuburb function
test('extractSuburb extracts suburb from address with postcode', () => {
  const address = '123 Main St, Subiaco WA 6008';
  expect(extractSuburb(address)).toBe('Subiaco');
});

test('extractSuburb extracts suburb from address without postcode', () => {
  const address = '123 Main St, Subiaco WA';
  expect(extractSuburb(address)).toBe('Subiaco');
});

test('extractSuburb returns Unknown for empty address', () => {
  expect(extractSuburb('')).toBe('Unknown');
});

// Test determineRegion function
test('determineRegion identifies North region correctly', () => {
  expect(determineRegion(-31.5, 115.8613)).toBe('North');
});

test('determineRegion identifies South region correctly', () => {
  expect(determineRegion(-32.5, 115.8613)).toBe('South');
});
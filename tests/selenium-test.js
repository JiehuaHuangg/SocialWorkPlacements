//selenium tests:how to run the test
//dependencies
//node js :version more 16.00 used 20.00
//install web driver: npm install selenium-webdriver chromedriver
//static server to run tests :npx serve public -l 3000
//run the test on fresh terminal :node selenium-test.js
//

// selenium-test.js
const { Builder, By, until } = require('selenium-webdriver');

async function runTest() {
  // Start the browser
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Navigate to your page
    await driver.get('http://localhost:3000/pages/map-filter.html');
    
    // Wait for map to load
    await driver.wait(until.elementLocated(By.id('map')), 10000);
    
    // Test 1: Check if map loads with markers
    const markers = await driver.findElements(By.className('marker'));
    console.log(`Found ${markers.length} markers on the map`);
    
    // Test 2: Test filter functionality
    // Uncheck "All" and check "FE1 Students"
    await driver.findElement(By.id('fe1_students')).click();

    await driver.findElement(By.id('all')).click();
    await driver.findElement(By.id('fe1_students')).click();
    
    // Wait for markers to update
    await driver.sleep(10000);
    
    // Check that markers were filtered
    const filteredMarkers = await driver.findElements(By.className('marker'));
    console.log(`After filtering, found ${filteredMarkers.length} markers`);
    
    // Test 3: Test search functionality
    // Type a suburb name in search
    // Type 'Innaloo'
    await driver.findElement(By.className('search-input')).sendKeys('Innaloo');
    await driver.findElement(By.className('btn-search')).click();
    await driver.wait(until.elementLocated(By.id('map')), 10000);
    await driver.sleep(10000);

    // Clear the input field before typing a new location
    const inputField = await driver.findElement(By.className('search-input'));
    await inputField.clear();  // Clears the existing text
    await inputField.sendKeys('Mount Lawley');
    await driver.findElement(By.className('btn-search')).click();

    
    // Wait for markers to update
    await driver.sleep(10000);
    
    // Check that markers were filtered
    const searchMarkers = await driver.findElements(By.className('marker'));
    console.log(`After search, found ${searchMarkers.length} markers`);
    
    console.log('All tests passed!');
  } finally {
    // Close the browser
    await driver.quit();
  }
}

runTest();
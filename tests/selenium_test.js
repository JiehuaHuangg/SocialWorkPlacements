const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .build();

  try {
    console.log(" Opening login page...");
    await driver.get('http://127.0.0.1:5501/public/pages/login.html');//test link
    //login test
    await driver.findElement(By.css('button[data-bs-target="#loginModal"]')).click();
    await driver.wait(until.elementIsVisible(await driver.findElement(By.id('loginModal'))), 5000);
    //credential
    await driver.sleep(3000);
    await driver.findElement(By.id('loginEmail')).sendKeys('alanchacko42@gmail.com');
    await driver.sleep(3000); //break time
    await driver.findElement(By.id('loginPassword')).sendKeys('password');
    await driver.sleep(3000);
    //submit login form
    await driver.executeScript(`
      document.getElementById('loginForm').requestSubmit();
    `);
    await driver.sleep(7000);

    const path = require('path');//file path
    // path location
    const fe1Path = path.resolve(__dirname, './test-data/FE1 1.xlsx');
    const fe2Path = path.resolve(__dirname, './test-data/FE2 1.xlsx');
    const agencyPath = path.resolve(__dirname, './test-data/Agency 1.xlsx');
    const sessionalPath = path.resolve(__dirname, './test-data/Sessional 1.xlsx');
    // Upload FE1 Excel file
    await driver.findElement(By.id('fe1FileInput')).sendKeys(fe1Path);
    await driver.findElement(By.id('fe1UploadBtn')).click();
    await driver.sleep(8000);
    await driver.wait(until.alertIsPresent(), 3000);//alert bypassing
    await driver.switchTo().alert().accept();
    await driver.findElement(By.id('fe1NextBtn')).click();

    await driver.sleep(8000);
    // Upload FE2 Excel file
    await driver.findElement(By.id('fe2FileInput')).sendKeys(fe2Path);
    await driver.findElement(By.id('fe2UploadBtn')).click();
    await driver.sleep(8000);
    await driver.wait(until.alertIsPresent(), 8000);
    await driver.switchTo().alert().accept();
    await driver.findElement(By.id('fe2NextBtn')).click();

    await driver.sleep(8000);
    // Upload Agency Excel file
    await driver.findElement(By.id('agencyFileInput')).sendKeys(agencyPath);
    await driver.findElement(By.id('agencyUploadBtn')).click();
    await driver.sleep(8000);
    await driver.wait(until.alertIsPresent(), 8000);
    await driver.switchTo().alert().accept();
    await driver.findElement(By.id('agencyNextBtn')).click();
    
    await driver.sleep(8000);
    // Upload Sessional Excel file
    await driver.findElement(By.id('sessionalFileInput')).sendKeys(sessionalPath);
    await driver.findElement(By.id('sessionalUploadBtn')).click();
    await driver.sleep(8000);
    await driver.wait(until.alertIsPresent(), 8000);
    await driver.switchTo().alert().accept();
    
    await driver.sleep(8000);
    // Final Submit
    await driver.findElement(By.id('submitAllBtn')).click();
    await driver.sleep(8000);
    await driver.wait(until.alertIsPresent(), 5000);
    await driver.switchTo().alert().accept();

    //---need to remove
    await driver.wait(until.urlContains('map-filter.html'), 10000);
    console.log("Navigated to map-filter.html via navbar");

    // wait for map to load
    await driver.wait(until.elementLocated(By.id('map')), 10000);
    await driver.sleep(3000);
    let initialMarkers = await driver.findElements(By.className('marker'));
    console.log(`Found ${initialMarkers.length} markers before filtering.`);
    await driver.findElement(By.id('fe1_students')).click();//select fe1 student checkbox need to remove
    await driver.findElement(By.id('all')).click();
    await driver.findElement(By.id('fe1_students')).click();//select fe1 student checkbox
    await driver.sleep(10000);
    
    // Check that markers were filtered
    const filteredMarkers = await driver.findElements(By.className('marker'));
    console.log(`After filtering, found ${filteredMarkers.length} markers`);
    
    // test search functionality
    await driver.findElement(By.className('search-input')).sendKeys('Innaloo');
    await driver.findElement(By.className('btn-search')).click();
    await driver.wait(until.elementLocated(By.id('map')), 10000);
    await driver.sleep(10000);

    // Clear the input field before typing a new location
    const inputField = await driver.findElement(By.className('search-input'));
    await inputField.clear();  // Clears the existing text
    await inputField.sendKeys('Mount Lawley');
    await driver.findElement(By.className('btn-search')).click();
    await inputField.clear();  // Clears the existing text

    await driver.sleep(10000);
    // Check that markers were filtered
    const searchMarkers = await driver.findElements(By.className('marker'));
    console.log(`After search, found ${searchMarkers.length} markers`);
    // REGION filter: Central and South
    await driver.findElement(By.css('[data-region="Central"]')).click();
    await driver.sleep(1000);
    await driver.findElement(By.css('[data-region="South"]')).click();
    await driver.sleep(2000); 

    //GENDER filter: Male 
    await driver.findElement(By.id('male')).click();
    await driver.sleep(2000);

    // STUDENT TYPE: Domestic
    await driver.findElement(By.id('domestic_student')).click();
    await driver.sleep(2000);

    // Wait for at least some sectors to load
    await driver.wait(until.elementLocated(By.css('#interest-filters .filter-option')), 10000);
    await driver.sleep(3000); 
    // Get all sector filter options
    const sectorElements = await driver.findElements(By.css('#interest-filters .filter-option'));
    // Define the sectors you want to click
    const targetSectors = ['Disability', 'AOD'];

    for (let el of sectorElements) {
    const label = await el.getText();
    if (targetSectors.includes(label)) {
        await el.click();
        console.log(`✅ Clicked sector filter: ${label}`);
        await driver.sleep(1000);
    }
    }
    // marker check after filters
    const filteredMarkerssecond = await driver.findElements(By.className('marker'));
    console.log(`Found ${filteredMarkerssecond.length} markers after applying full filters.`);

    console.log('All tests passed!');

  } catch (err) {
    console.error(' Test failed:', err);
  } finally {
    await driver.quit();
  }
}
runTest();
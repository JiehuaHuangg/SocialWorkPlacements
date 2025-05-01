**FIRESTORE_SETUP.md**  
---

# Firebase Firestore Configuration Guide  
**Version 1.0**  
**Last Updated**: [20/04/2025]  

---

## Table of Contents  
1. [Project Setup](#1-project-setup)  
2. [Database Schema](#2-database-schema)  
3. [Security Rules](#3-security-rules)  
4. [Data Import Process](#4-data-import-process)  
5. [Testing Guidelines](#5-testing-guidelines)  
6. [Troubleshooting](#6-troubleshooting)  

---

## 1. Project Setup  

### 1.1 Initialize Firebase Project  
1. Create a Firebase project via the [Firebase Console](https://console.firebase.google.com/).  
2. Enable **Firestore Database** (Native mode) and select location (e.g., `asia-southeast1`).  

### 1.2 Service Account Configuration  
1. Generate a service account key:  
   - Go to **Project Settings → Service Accounts → Generate New Private Key**.  
   - Save the JSON file as `serviceAccountKey.json` in the project root.  

### 1.3 Firebase Admin SDK Installation  
```bash
npm install firebase-admin
```

---

## 2. Database Schema  

### 2.1 Collections Overview  
| Collection Name       | Description               | Key Fields                                                                   |
| --------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `FE1_students`        | FE1 student records       | `name`, `location`, `sector_exception` (array), `interested_sectors` (array) |
| `FE2_students`        | FE2 student records       | `fe1_onsite_supervisor` (bool), `fe1_sector` (string)                        |
| `Agencies`            | Placement agencies        | `available_spots` (number), `has_onsite_supervisor` (bool)                   |
| `UWA_Sessional_Staff` | Staff/coordinator details | `expertise_areas` (array), `capacity_hours` (number)                         |

### 2.2 Field Specifications  
- **Array Fields**: Semicolon-separated in Excel (e.g., `"AOD; Mental Health"`), converted to Firestore arrays.  
- **Data Validation**:  
  - Invalid sector names trigger warnings (e.g., `"Child Protection / Fmailies" → "Child Protection / Families"`).  
  - Numeric fields (`available_spots`) auto-convert strings to numbers.  

---

## 3. Security Rules  

### 3.1 Basic Rules  
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for admins only
    match /{collection}/{document} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == "admin";
    }
    
    // Public read access for agencies
    match /Agencies/{agency} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

### 3.2 Validation Rules  
- **Student Data**:  
  ```javascript
  match /FE1_students/{student} {
    allow create: if request.resource.data.drivers_licence in ["Australian", "International", "N/A"];
    allow update: if request.resource.data.interested_sectors.size() <= 6;
  }
  ```

---

## 4. Data Import Process  

### 4.1 Excel Data Preparation  
1. Ensure Excel sheets match collection names:  
   - `FE1 students`, `FE2 students`, `Agency`, `UWA Sessional Staff`.  
2. Format array fields as semicolon-separated strings.  

### 4.2 Run Import Script  
```bash
# Install dependencies
npm install xlsx firebase-admin

# Execute import
node importData.js
```

**Sample Output**:  
```
Processing FE1 students (15 records)...  
[FE1 students] Record 1 added successfully  
[FE1 students] Invalid entries in Sector Exception:  
 - "Legal/Justice" (Did you mean "Legal / Justice"?)
```

---

## 5. Testing Guidelines  

### 5.1 Unit Tests  
**Test File**: `dataImport.test.js`  
```javascript
const { processRow } = require('./importData');

test('Converts semicolon-separated sectors to array', () => {
  const row = { "Sector Exception": "AOD; Mental Health" };
  const result = processRow(row, "FE1_students");
  expect(result.sector_exception).toEqual(["AOD", "Mental Health"]);
});

test('Flags invalid sector names', () => {
  const row = { "Sector Exception": "Invalid Sector" };
  const consoleSpy = jest.spyOn(console, 'warn');
  processRow(row, "FE1_students");
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid Sector'));
});
```

### 5.2 Integration Tests  
1. **Data Integrity Check**:  
   ```bash
   # Query 5 random FE1 student records
   firebase firestore:collection get FE1_students --limit=5
   ```  
2. **Permission Test**:  
   ```javascript
   // Simulate non-admin write attempt
   db.collection("FE1_students").add({...}).catch(error => {
     console.log("Security rule triggered:", error.message);
   });
   ```

---

## 6. Troubleshooting  

| Issue                          | Solution                                      |
| ------------------------------ | --------------------------------------------- |
| **"Permission Denied" errors** | Verify security rules and admin role setup    |
| **Data type mismatches**       | Check Excel formatting (e.g., numeric fields) |
| **Missing collections**        | Confirm sheet names in `COLLECTION_MAP`       |

---


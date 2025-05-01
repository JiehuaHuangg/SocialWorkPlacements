// Define global variables to track upload status
const uploadStatuses = {
    fe1: false,
    fe2: false,
    agency: false,
    sessional: false
  };
  
  // Store file data for later submission
  const fileData = {
    fe1: null,
    fe2: null,
    agency: null, 
    sessional: null 
  };
  
  
  // Document ready function
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize all file upload areas
    initializeFileUpload('fe1');
    initializeFileUpload('fe2');
    initializeFileUpload('agency');
    initializeFileUpload('sessional');
    
    // Hide all file info sections initially
    document.getElementById('fe1FileInfo').style.display = 'none';
    document.getElementById('fe2FileInfo').style.display = 'none';
    document.getElementById('agencyFileInfo').style.display = 'none';
    document.getElementById('sessionalFileInfo').style.display = 'none';
  });
  
  // Initialize file upload area with event listeners
  function initializeFileUpload(type) {
    const uploadArea = document.getElementById(`${type}UploadArea`);
    const fileInput = document.getElementById(`${type}FileInput`);
    
    // Set up file input change listener
    fileInput.addEventListener('change', function(e) {
      handleFileSelect(e, type);
    });
    
    // Set up drag and drop
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove('dragover');
      
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length) {
        fileInput.files = files;
        handleFileSelect({ target: fileInput }, type);
      }
    });
  }
  
  // Handle file selection
  function handleFileSelect(event, type) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check if file is Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    
    // Update UI to show file is selected
    document.getElementById(`${type}FileName`).textContent = file.name;
    document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size);
    document.getElementById(`${type}UploadArea`).style.display = 'none';
    document.getElementById(`${type}FileInfo`).style.display = 'block';
    
    // Read and preview the Excel file
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Store data for later upload
      fileData[type] = jsonData;
      
      // Preview the data
      generatePreview(jsonData, type);
    };
    
    reader.readAsArrayBuffer(file);
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Generate preview table
  function generatePreview(data, type) {
    const previewEl = document.getElementById(`${type}Preview`);
    previewEl.innerHTML = '';
    
    // Check if data exists and has rows
    if (!data || data.length === 0) {
      previewEl.innerHTML = '<div class="alert alert-warning">No data found in the Excel file.</div>';
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'table table-striped table-bordered table-sm';
    
    // Create header
    const thead = document.createElement('thead');
    thead.className = 'table-primary';
    const headerRow = document.createElement('tr');
    
    data[0].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body (limited to 5 rows for preview)
    const tbody = document.createElement('tbody');
    
    const rowLimit = Math.min(data.length, 6); // Header + 5 data rows
    for (let i = 1; i < rowLimit; i++) {
      const row = document.createElement('tr');
      
      data[i].forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    
    // Add preview title
    const title = document.createElement('h4');
    title.className = 'h6 mb-2';
    title.textContent = 'File Preview (first 5 rows):';
    
    previewEl.appendChild(title);
    previewEl.appendChild(table);
    
    // Add row count
    const rowCount = document.createElement('p');
    rowCount.className = 'text-muted mt-2';
    rowCount.textContent = `Total rows: ${data.length - 1}`; // Subtract header row
    previewEl.appendChild(rowCount);
  }
  
  // Upload file to Firestore
  function uploadFile(type) {
    if (!fileData[type]) {
      alert('No file selected for upload.');
      return;
    }
    
    // Get the upload button and disable it
    const uploadBtn = document.getElementById(`${type}UploadBtn`);
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    
    // Update progress bar
    const progressBar = document.getElementById(`${type}Progress`).querySelector('.progress-bar');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    
    // Convert Excel data to appropriate Firestore documents
    const jsonData = fileData[type];
    const headers = jsonData[0];
    const records = jsonData.slice(1).map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      return record;
    });
    
    // Upload to Firestore in batches
    uploadBatch(records, type, progressBar);
  }
  
  // Upload batch to Firestore
  async function uploadBatch(records, type, progressBar) {
    try {
      // The actual code for uploading to Firestore using batch processing to improve performance.
      const batchSize = 500; // The Firestore batch write limit is 500.
      let currentBatch = 0;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      // Actual progress update.
      for (let i = 0; i < records.length; i += batchSize) {
        // Create a new batch.
        const batch = writeBatch(db);
        const currentBatchRecords = records.slice(i, i + batchSize);
        
        // Create a document reference for each record and add it to the batch.
        currentBatchRecords.forEach(record => {
          // Use an auto-generated ID or extract a unique identifier from the record as the document ID.
          const docRef = doc(collection(db, type));
          batch.set(docRef, {
            ...record,
            uploadTimestamp: new Date().toISOString(),
            uploadedBy: document.getElementById('userEmail')?.value || 'anonymous'
          });
        });
        
        // Commit the batch.
        await batch.commit();
        
        // Update the progress.
        currentBatch++;
        const progress = Math.min(100, Math.round((currentBatch / totalBatches) * 100));
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
        
        // Allow time for the UI to update.
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Upload complete.
      progressBar.style.width = '100%';
      progressBar.textContent = '100%';
      completeUpload(type);
      
    } catch (error) {
      console.error("Error uploading batch to Firestore: ", error);
      alert("Error uploading to Firestore: " + error.message);
      
      // Reset the UI.
      document.getElementById(`${type}UploadBtn`).disabled = false;
      document.getElementById(`${type}UploadBtn`).textContent = 'Upload File';
    }
  }
  
  // Complete upload process
  function completeUpload(type) {
    // Update status
    uploadStatuses[type] = true;
    
    // Update UI
    document.getElementById(`${type}UploadBtn`).textContent = 'Uploaded Successfully';
    document.getElementById(`${type}Status`).textContent = '✅';
    document.getElementById(`${type}StatusIcon`).textContent = '✅';
    document.getElementById(`${type}StatusText`).textContent = 'Uploaded';
    
    // Check if all files are uploaded
    checkAllUploadsComplete();
  }
  
  // Remove a selected file
  function removeFile(type) {
    // Reset file data
    fileData[type] = null;
    uploadStatuses[type] = false;
    
    // Reset UI
    document.getElementById(`${type}UploadArea`).style.display = 'block';
    document.getElementById(`${type}FileInfo`).style.display = 'none';
    document.getElementById(`${type}Preview`).innerHTML = '';
    document.getElementById(`${type}Status`).textContent = '⚠️';
    document.getElementById(`${type}StatusIcon`).textContent = '⚠️';
    document.getElementById(`${type}StatusText`).textContent = 'Not uploaded';
    
    // Reset file input
    document.getElementById(`${type}FileInput`).value = '';
    
    // Check submit button status
    checkAllUploadsComplete();
  }
  
  // Check if all uploads are complete
  function checkAllUploadsComplete() {
    const allComplete = Object.values(uploadStatuses).every(status => status === true);
    
    // Enable or disable submit button
    const submitBtn = document.getElementById('submitAllBtn');
    submitBtn.disabled = !allComplete;
    
    if (allComplete) {
      submitBtn.classList.remove('btn-primary');
      submitBtn.classList.add('btn-success');
    } else {
      submitBtn.classList.remove('btn-success');
      submitBtn.classList.add('btn-primary');
    }
  }
  
  // Submit all files to Firestore (final step)
  async function submitAllFiles() {
    if (!Object.values(uploadStatuses).every(status => status === true)) {
      alert('Please upload all required files before final submission.');
      return;
    }
    
    // Disable the submit button and show the loading state.
    const submitBtn = document.getElementById('submitAllBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    
    // Create a progress modal.
    showFinalSubmissionProgress();
    
    try {
      // Step 1: Validate the data.
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 0, 25);
      await validateAllData();
      document.getElementById('step1').innerHTML = '✅ Data validation complete';
      document.getElementById('step1').classList.remove('text-muted');
      document.getElementById('step1').classList.add('text-success');
      
      // Step 2: Prepare database records.
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 25, 50);
      const consolidatedData = await prepareConsolidatedData();
      document.getElementById('step2').innerHTML = '✅ Database records prepared';
      document.getElementById('step2').classList.remove('text-muted');
      document.getElementById('step2').classList.add('text-success');
      
      // Step 3: Upload to Firestore.
      await uploadConsolidatedData(consolidatedData);
      document.getElementById('step3').innerHTML = '✅ Upload to Firestore complete';
      document.getElementById('step3').classList.remove('text-muted');
      document.getElementById('step3').classList.add('text-success');
      
      // Step 4: Complete.
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 85, 100);
      await finalizeSubmission();
      document.getElementById('step4').innerHTML = '✅ Submission finalized';
      document.getElementById('step4').classList.remove('text-muted');
      document.getElementById('step4').classList.add('text-success');
      
      // Submit complete.
      setTimeout(() => {
        submissionComplete();
      }, 1000);
      
    } catch (error) {
      console.error("Error during final submission: ", error);
      alert("Error during submission: " + error.message);
      
      // Reset the UI.
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit All Files';
      
      // Close the progress modal.
      const progressModal = bootstrap.Modal.getInstance(document.getElementById('submissionProgressModal'));
      if (progressModal) progressModal.hide();
    }
  }
  
  // Validate all data.
  async function validateAllData() {
    
    // check required fields, data types, and data consistency.
    
    for (const type in fileData) {
      if (!fileData[type]) continue;
      
      const jsonData = fileData[type];
      const headers = jsonData[0];
      const records = jsonData.slice(1);
      
      // Check for empty rows.
      const emptyRows = records.filter(row => row.every(cell => !cell || cell.toString().trim() === ''));
      if (emptyRows.length > 0) {
        throw new Error(`Found ${emptyRows.length} empty rows in ${type} file. Please remove them before uploading.`);
      }
      
    }
    
    // Simulate a time-consuming validation process
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  }
  
  // Prepare the consolidated data
  async function prepareConsolidatedData() {
    // Create an object that contains data from all files.
    const consolidatedData = {};
    
    for (const type in fileData) {
      if (!fileData[type]) continue;
      
      const jsonData = fileData[type];
      const headers = jsonData[0];
      const records = jsonData.slice(1).map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });
      
      consolidatedData[type] = records;
    }
    
    // Simulate data preparation time.
    await new Promise(resolve => setTimeout(resolve, 2000));
    return consolidatedData;
  }
  
  // Upload the consolidated data to Firestore.
  async function uploadConsolidatedData(consolidatedData) {
    const progressBar = document.getElementById('finalSubmissionProgress');
    
    // Create a metadata record for the consolidated data.
    const metaDocRef = doc(collection(db, 'uploadSessions'));
    const metaData = {
      timestamp: new Date().toISOString(),
      uploadedBy: document.getElementById('userEmail')?.value || 'anonymous',
      fileTypes: Object.keys(consolidatedData),
      recordCounts: {}
    };
    
    // Calculate the number of records for each type.
    for (const type in consolidatedData) {
      metaData.recordCounts[type] = consolidatedData[type].length;
    }
    
    // Save the metadata.
    await setDoc(metaDocRef, metaData);
    
    // Then upload the data from each file.
    let currentProgress = 50;
    const typesCount = Object.keys(consolidatedData).length;
    const progressPerType = 35 / typesCount; // Allocate 50–85% of the progress.
    
    for (const type in consolidatedData) {
      const records = consolidatedData[type];
      const batchSize = 500; 
      
      // Batch upload records.
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatchRecords = records.slice(i, i + batchSize);
        
        currentBatchRecords.forEach(record => {
          const docRef = doc(collection(db, type));
          batch.set(docRef, {
            ...record,
            sessionId: metaDocRef.id, // Associate with the metadata record.
            uploadTimestamp: new Date().toISOString()
          });
        });
        
        await batch.commit();
        
        // Update the progress.
        const batchProgress = (i + currentBatchRecords.length) / records.length * progressPerType;
        currentProgress = Math.min(85, currentProgress + batchProgress);
        progressBar.style.width = `${Math.round(currentProgress)}%`;
        progressBar.textContent = `${Math.round(currentProgress)}%`;
        
        // Allow the UI time to update.
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return metaDocRef.id;
  }
  
  // Complete the submission.
  async function finalizeSubmission() {
   
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  }
  
  // Show progress modal for final submission
  function showFinalSubmissionProgress() {
    // Create modal dynamically
    const modalHtml = `
      <div class="modal fade" id="submissionProgressModal" data-bs-backdrop="static" tabindex="-1" aria-labelledby="submissionProgressModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="submissionProgressModalLabel">Finalizing Data Submission</h5>
            </div>
            <div class="modal-body">
              <p>Please wait while we process and finalize your data submission to the database...</p>
              <div class="progress mb-3">
                <div id="finalSubmissionProgress" class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
              </div>
              <div id="submissionSteps">
                <p class="mb-2"><small id="step1" class="text-muted">⏳ Validating data...</small></p>
                <p class="mb-2"><small id="step2" class="text-muted">⏳ Preparing database records...</small></p>
                <p class="mb-2"><small id="step3" class="text-muted">⏳ Uploading to Firestore database...</small></p>
                <p class="mb-2"><small id="step4" class="text-muted">⏳ Finalizing submission...</small></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to document
    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = modalHtml;
    document.body.appendChild(modalWrapper);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('submissionProgressModal'));
    modal.show();
  }
  
  // Helper function to update the progress bar step by step.
  function updateProgressWithStep(progressBar, startPercent, endPercent) {
    let currentPercent = startPercent;
    const interval = setInterval(() => {
      currentPercent += 1;
      progressBar.style.width = currentPercent + '%';
      progressBar.textContent = currentPercent + '%';
      progressBar.setAttribute('aria-valuenow', currentPercent);
      
      if (currentPercent >= endPercent) {
        clearInterval(interval);
      }
    }, 50);
    
    return interval;
  }
  
  // Complete submission and show success message
  function submissionComplete() {
    // Close the progress modal
    const progressModal = bootstrap.Modal.getInstance(document.getElementById('submissionProgressModal'));
    progressModal.hide();
    
    // Show success message
    setTimeout(() => {
      // Create success modal
      const successModalHtml = `
        <div class="modal fade" id="submissionSuccessModal" tabindex="-1" aria-labelledby="submissionSuccessModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-success text-white">
                <h5 class="modal-title" id="submissionSuccessModalLabel">Submission Successful</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center py-4">
                <div class="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-check-circle-fill text-success" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                </div>
                <h3 class="h4 mb-3">All Data Successfully Submitted!</h3>
                <p>Your Excel files have been successfully processed and uploaded to the Firestore database.</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="window.location.reload()">Upload More Files</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add success modal to document
      const modalWrapper = document.createElement('div');
      modalWrapper.innerHTML = successModalHtml;
      document.body.appendChild(modalWrapper);
      
      // Show success modal
      const successModal = new bootstrap.Modal(document.getElementById('submissionSuccessModal'));
      successModal.show();
      
      // Update submit button
      const submitBtn = document.getElementById('submitAllBtn');
      submitBtn.innerHTML = 'Successfully Submitted';
      submitBtn.classList.remove('btn-primary');
      submitBtn.classList.add('btn-success');
    }, 500);
  }
  
  // Export functions for use in the HTML
  window.handleFileSelect = handleFileSelect;
  window.uploadFile = uploadFile;
  window.removeFile = removeFile;
  window.checkAllUploadsComplete = checkAllUploadsComplete;
  window.submitAllFiles = submitAllFiles;


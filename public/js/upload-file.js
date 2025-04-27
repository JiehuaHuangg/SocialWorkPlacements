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
  
  // Initialize Firebase (you'll need to replace with your actual Firebase config)
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { collection, doc, getFirestore, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  addDoc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "./firebase-config.js";
  
  const firebaseConfig = {
    apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
    authDomain: "social-work-placement.firebaseapp.com",
    projectId: "social-work-placement",
    storageBucket: "social-work-placement.firebasestorage.app",
    messagingSenderId: "465758786519",
    appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
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
      // 实际上传到Firestore的代码，使用批处理以提高性能
      const batchSize = 500; // Firestore批处理上限是500
      let currentBatch = 0;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      // 实际的进度更新
      for (let i = 0; i < records.length; i += batchSize) {
        // 创建新的批处理
        const batch = writeBatch(db);
        const currentBatchRecords = records.slice(i, i + batchSize);
        
        // 为每条记录创建文档引用并添加到批处理中
        currentBatchRecords.forEach(record => {
          // 使用自动生成的ID或者从记录中提取唯一标识符作为文档ID
          const docRef = doc(collection(db, type));
          batch.set(docRef, {
            ...record,
            uploadTimestamp: new Date().toISOString(),
            uploadedBy: document.getElementById('userEmail')?.value || 'anonymous'
          });
        });
        
        // 提交批处理
        await batch.commit();
        
        // 更新进度
        currentBatch++;
        const progress = Math.min(100, Math.round((currentBatch / totalBatches) * 100));
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
        
        // 让UI有时间更新
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 完成上传
      progressBar.style.width = '100%';
      progressBar.textContent = '100%';
      completeUpload(type);
      
    } catch (error) {
      console.error("Error uploading batch to Firestore: ", error);
      alert("Error uploading to Firestore: " + error.message);
      
      // 重置UI
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
    
    // 禁用提交按钮并显示加载状态
    const submitBtn = document.getElementById('submitAllBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    
    // 创建进度模态框
    showFinalSubmissionProgress();
    
    try {
      // 步骤1：验证数据
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 0, 25);
      await validateAllData();
      document.getElementById('step1').innerHTML = '✅ Data validation complete';
      document.getElementById('step1').classList.remove('text-muted');
      document.getElementById('step1').classList.add('text-success');
      
      // 步骤2：准备数据库记录
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 25, 50);
      const consolidatedData = await prepareConsolidatedData();
      document.getElementById('step2').innerHTML = '✅ Database records prepared';
      document.getElementById('step2').classList.remove('text-muted');
      document.getElementById('step2').classList.add('text-success');
      
      // 步骤3：上传到Firestore
      await uploadConsolidatedData(consolidatedData);
      document.getElementById('step3').innerHTML = '✅ Upload to Firestore complete';
      document.getElementById('step3').classList.remove('text-muted');
      document.getElementById('step3').classList.add('text-success');
      
      // 步骤4：完成
      updateProgressWithStep(document.getElementById('finalSubmissionProgress'), 85, 100);
      await finalizeSubmission();
      document.getElementById('step4').innerHTML = '✅ Submission finalized';
      document.getElementById('step4').classList.remove('text-muted');
      document.getElementById('step4').classList.add('text-success');
      
      // 完成提交
      setTimeout(() => {
        submissionComplete();
      }, 1000);
      
    } catch (error) {
      console.error("Error during final submission: ", error);
      alert("Error during submission: " + error.message);
      
      // 重置UI
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit All Files';
      
      // 关闭进度模态框
      const progressModal = bootstrap.Modal.getInstance(document.getElementById('submissionProgressModal'));
      if (progressModal) progressModal.hide();
    }
  }
  
  // 实际验证所有数据
  async function validateAllData() {
    // 在这里添加实际的数据验证逻辑
    // 例如检查必填字段、数据类型、数据一致性等
    
    // 示例验证逻辑
    for (const type in fileData) {
      if (!fileData[type]) continue;
      
      const jsonData = fileData[type];
      const headers = jsonData[0];
      const records = jsonData.slice(1);
      
      // 检查是否有空行
      const emptyRows = records.filter(row => row.every(cell => !cell || cell.toString().trim() === ''));
      if (emptyRows.length > 0) {
        throw new Error(`Found ${emptyRows.length} empty rows in ${type} file. Please remove them before uploading.`);
      }
      
      // 在这里可以添加更多验证...
    }
    
    // 模拟验证过程需要时间
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  }
  
  // 准备整合的数据
  async function prepareConsolidatedData() {
    // 创建一个包含所有文件数据的对象
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
    
    // 模拟准备数据需要时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    return consolidatedData;
  }
  
  // 上传整合后的数据到Firestore
  async function uploadConsolidatedData(consolidatedData) {
    const progressBar = document.getElementById('finalSubmissionProgress');
    
    // 创建整合数据的元数据记录
    const metaDocRef = doc(collection(db, 'uploadSessions'));
    const metaData = {
      timestamp: new Date().toISOString(),
      uploadedBy: document.getElementById('userEmail')?.value || 'anonymous',
      fileTypes: Object.keys(consolidatedData),
      recordCounts: {}
    };
    
    // 计算每种类型的记录数
    for (const type in consolidatedData) {
      metaData.recordCounts[type] = consolidatedData[type].length;
    }
    
    // 首先保存元数据
    await setDoc(metaDocRef, metaData);
    
    // 然后上传各个文件的数据
    let currentProgress = 50;
    const typesCount = Object.keys(consolidatedData).length;
    const progressPerType = 35 / typesCount; // 分配50-85%的进度
    
    for (const type in consolidatedData) {
      const records = consolidatedData[type];
      const batchSize = 500; // Firestore批处理上限
      
      // 批量上传记录
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatchRecords = records.slice(i, i + batchSize);
        
        currentBatchRecords.forEach(record => {
          const docRef = doc(collection(db, type));
          batch.set(docRef, {
            ...record,
            sessionId: metaDocRef.id, // 关联到元数据记录
            uploadTimestamp: new Date().toISOString()
          });
        });
        
        await batch.commit();
        
        // 更新进度
        const batchProgress = (i + currentBatchRecords.length) / records.length * progressPerType;
        currentProgress = Math.min(85, currentProgress + batchProgress);
        progressBar.style.width = `${Math.round(currentProgress)}%`;
        progressBar.textContent = `${Math.round(currentProgress)}%`;
        
        // 让UI有时间更新
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return metaDocRef.id;
  }
  
  // 完成提交
  async function finalizeSubmission() {
    // 在这里可以执行任何最终的清理或记录操作
    
    // 模拟最终处理需要时间
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
  
  // 分步更新进度条的辅助函数
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

const mapboxToken = "pk.eyJ1IjoiYWxhbjAwNyIsImEiOiJjbTd5MGFtcTkwNHIyMndxYm85czZjcnc0In0.61fFzlPTeu4vErDSO8-MVA"
// Track upload status for each category
const uploadStatus = {
  fe1: false,
  fe2: false,
  agency: false,
  sessional: false,
}
const uploadedFiles = {
  fe1: null,
  fe2: null,
  agency: null,
  sessional: null,
}

// Current active step
let currentStep = 1

// Set up drag and drop for all upload areas
document.addEventListener("DOMContentLoaded", () => {
  const types = ["fe1", "fe2", "agency", "sessional"]

  types.forEach((type) => {
    setupDragAndDrop(type)

    // File input onchange
    const input = document.getElementById(`${type}FileInput`)
    if (input) {
      input.addEventListener("change", function () {
        handleFileSelect(this, type)
      })
    }

    // Upload button
    const uploadBtn = document.getElementById(`${type}UploadBtn`)
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => uploadFile(type))
    }

    // Browse Files button
    const browseBtn = document.querySelector(`#${type}UploadArea button`)
    if (browseBtn && input) {
      browseBtn.addEventListener("click", () => input.click())
    }

    // Remove button - using event delegation for dynamically added elements
    document.addEventListener("click", (e) => {
      if (e.target && e.target.closest(`#${type}FileInfo .btn-outline-danger`)) {
        removeFile(type)
      }
    })

    // Next button
    const nextBtn = document.getElementById(`${type}NextBtn`)
    const stepNumber = getStepNumberFromType(type)
    if (nextBtn) {
      nextBtn.addEventListener("click", () => goToNextStep(stepNumber))
    }

    // Previous button (steps 2 to 4)
    if (stepNumber > 1) {
      const prevBtn = document.querySelector(`#section${stepNumber} .btn-outline-secondary`)
      if (prevBtn) {
        prevBtn.addEventListener("click", () => goToPreviousStep(stepNumber))
      }
    }
  })

  // Final submit
  const submitBtn = document.getElementById("submitAllBtn")
  if (submitBtn) {
    submitBtn.addEventListener("click", submitAllFiles)
  }

  updateSubmitButton()
  updateStepIndicator(1)
})

/**
 * Sets up drag and drop functionality for a specific upload area
 * @param {string} type - The type of upload area (fe1, fe2, agency, sessional)
 */
function setupDragAndDrop(type) {
  const dropArea = document.getElementById(`${type}UploadArea`)
  ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false)
  })

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }
  ;["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, highlight, false)
  })
  ;["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, unhighlight, false)
  })

  function highlight() {
    dropArea.classList.add("bg-light")
  }

  function unhighlight() {
    dropArea.classList.remove("bg-light")
  }

  dropArea.addEventListener(
    "drop",
    (e) => {
      const dt = e.dataTransfer
      const files = dt.files

      if (files.length) {
        const fileInput = document.getElementById(`${type}FileInput`)
        fileInput.files = files
        handleFileSelect(fileInput, type)
      }
    },
    false,
  )
}

/**
 * Handles file selection from input or drag and drop
 * @param {HTMLInputElement} input - The file input element
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function handleFileSelect(input, type) {
  if (input.files && input.files[0]) {
    const file = input.files[0]

    // Save file for uploading later
    uploadedFiles[type] = file

    // Check if file is Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert("Please select an Excel file (.xlsx or .xls)")
      input.value = ""
      return
    }

    // Display file info
    document.getElementById(`${type}FileName`).textContent = file.name
    document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size)
    document.getElementById(`${type}FileInfo`).style.display = "block"
    document.getElementById(`${type}UploadArea`).style.display = "none"

    // Preview Excel file
    previewExcel(file, type)
  }
}

/**
 * Removes the selected file and resets the upload area
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function removeFile(type) {
  // Reset file input
  const fileInput = document.getElementById(`${type}FileInput`)
  if (fileInput) {
    fileInput.value = ""
  }

  // Reset display elements
  document.getElementById(`${type}FileInfo`).style.display = "none"
  document.getElementById(`${type}UploadArea`).style.display = "block"
  document.getElementById(`${type}Preview`).innerHTML = ""

  // Reset progress bar
  const progressContainer = document.getElementById(`${type}Progress`)
  if (progressContainer) {
    progressContainer.style.display = "none"
    const progressBar = progressContainer.querySelector(".progress-bar")
    if (progressBar) {
      progressBar.style.width = "0%"
      progressBar.setAttribute("aria-valuenow", "0")
      progressBar.textContent = ""
    }
  }

  // Reset upload button
  const uploadBtn = document.getElementById(`${type}UploadBtn`)
  if (uploadBtn) {
    uploadBtn.disabled = false
    uploadBtn.innerHTML = "Upload File"
    uploadBtn.classList.add("btn-accent")
    uploadBtn.classList.remove("btn-success")
  }

  // Update status
  uploadStatus[type] = false
  updateStatus(type, false)
  updateSubmitButton()

  // Disable next button
  const nextBtn = document.getElementById(`${type}NextBtn`)
  if (nextBtn) {
    nextBtn.disabled = true
  }

  // Remove the file from uploadedFiles
  uploadedFiles[type] = null

  console.log(`File removed for ${type}`)
}

/**
 * Formats file size in bytes to a human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Validates Excel columns against required columns
 * @param {Object} worksheet - XLSX worksheet object
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 * @returns {boolean} - Whether the columns are valid
 */
function validateExcelColumns(worksheet, type) {
  // Get the headers from the first row
  const range = XLSX.utils.decode_range(worksheet["!ref"])
  const headers = []

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]
    headers.push(cell ? cell.v : undefined)
  }

  // Define required columns for each type
  const requiredColumns = {
    fe1: [
      "Name",
      "Location",
      "Sector Exception",
      "Interested sectors",
      "Domestic / International",
      "Driver's Licence",
      "First Nations (Aboriginal & Torres Strait Islanders)",
      "UWA FE Coordinators",
    ],
    fe2: [
      "Name",
      "Location",
      "Sector Exception",
      "Interested sectors",
      "FE1 Onsite Supervisor",
      "FE 1 Sector",
      "Domestic / International",
      "Driver's Licence",
      "First Nations (Aboriginal & Torres Strait Islanders)",
      "UWA FE Coordinators",
    ],
    agency: [
      "Name",
      "Location",
      "Sector",
      "Exception",
      "Available spots",
      "First Nations (Aboriginal & Torres Strait Islanders)",
      "Onsite SW Supervisor",
    ],
    sessional: ["Name", "Location", "LO", "EFE"],
  }

  // Check if all required columns are present
  const missingColumns = requiredColumns[type].filter((col) => !headers.includes(col))

  if (missingColumns.length > 0) {
    alert(
      `Missing required columns: ${missingColumns.join(", ")}\n\nPlease check the "Required Columns" for the correct format.`,
    )
    return false
  }

  return true
}

/**
 * Previews Excel file content in a table (limited to first 5 rows)
 * @param {File} file - The Excel file to preview
 */
function previewExcel(file, type) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: "array" })
    const firstSheet = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheet]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    const limitedData = jsonData.slice(0, Math.min(6, jsonData.length))
    let htmlTable = `<div class="scroll-preview" style="overflow-x: auto; overflow-y: auto; max-width: 100%; max-height: 300px;"><table id="${type}Table" class="table table-striped table-bordered table-hover table-sm" style="min-width: 800px;">`

    if (limitedData.length > 0) {
      htmlTable += '<thead class="table-primary"><tr>'
      limitedData[0].forEach((header) => {
        htmlTable += `<th style="background-color: #27358C; color: white;">${header}</th>`
      })
      htmlTable += "</tr></thead>"
    }

    if (limitedData.length > 1) {
      htmlTable += "<tbody>"
      for (let i = 1; i < limitedData.length; i++) {
        htmlTable += "<tr>"
        const row = limitedData[i]
        const headerLength = limitedData[0].length
        for (let j = 0; j < headerLength; j++) {
          htmlTable += `<td>${row[j] !== undefined ? row[j] : ""}</td>`
        }
        htmlTable += "</tr>"
      }
      htmlTable += "</tbody>"
    }

    htmlTable += "</table></div>"

    const totalRows = jsonData.length - 1
    const rowCountInfo = `<p class="text-muted mt-2">Showing 5 of ${totalRows} rows</p>`

    document.getElementById(`${type}Preview`).innerHTML = `
      <h4 class="h6 mb-3">File Preview (Sheet: ${firstSheet})</h4>
      <div class="table-responsive">
        ${htmlTable}
        ${totalRows > 5 ? rowCountInfo : ""}
      </div>
    `
  }
  reader.readAsArrayBuffer(file)
}

/**
 * Simulates file upload with progress bar
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function uploadFile(type) {
  const progressBar = document.getElementById(`${type}Progress`).querySelector(".progress-bar")
  const progressContainer = document.getElementById(`${type}Progress`)
  const uploadBtn = document.getElementById(`${type}UploadBtn`)

  progressContainer.style.display = "block"
  uploadBtn.disabled = true
  uploadBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...'

  // Simulate file processing stages
  const stages = [
    { percent: 15, time: 500, message: "Reading file..." },
    { percent: 30, time: 700, message: "Validating data..." },
    { percent: 50, time: 800, message: "Processing records..." },
    { percent: 75, time: 600, message: "Finalizing..." },
    { percent: 100, time: 400, message: "Complete!" },
  ]

  let currentStage = 0

  function processStage() {
    if (currentStage >= stages.length) {
      // All stages complete
      setTimeout(() => {
        // Mark as uploaded
        uploadStatus[type] = true
        updateStatus(type, true)
        updateSubmitButton()

        // Enable next button
        const nextBtn = document.getElementById(`${type}NextBtn`)
        if (nextBtn) {
          nextBtn.disabled = false
        }

        // Update step indicator
        const stepNumber = getStepNumberFromType(type)
        updateStepIndicator(stepNumber, true)

        // Show success message
        let typeName = type
        if (type === "fe1") typeName = "FE1 Students"
        if (type === "fe2") typeName = "FE2 Students"
        if (type === "agency") typeName = "Agency"
        if (type === "sessional") typeName = "Sessional Staff"

        alert(`${typeName} Excel file uploaded successfully!`)

        // Update the upload button
        uploadBtn.disabled = true
        uploadBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Uploaded'
        uploadBtn.classList.remove("btn-accent")
        uploadBtn.classList.add("btn-success")
      }, 500)
      return
    }

    const stage = stages[currentStage]
    const prevPercent = currentStage > 0 ? stages[currentStage - 1].percent : 0

    // Animate progress from previous stage to current stage
    let percent = prevPercent
    const increment = (stage.percent - prevPercent) / 10

    const intervalId = setInterval(() => {
      percent += increment
      if (percent >= stage.percent) {
        percent = stage.percent
        clearInterval(intervalId)

        // Add a small delay before moving to next stage
        setTimeout(() => {
          currentStage++
          processStage()
        }, stage.time)
      }

      progressBar.style.width = percent + "%"
      progressBar.setAttribute("aria-valuenow", percent)

      // Update text inside progress bar for larger screens
      if (window.innerWidth >= 768) {
        progressBar.textContent = stage.message
      }
    }, 50)
  }

  // Start the first stage
  processStage()
}

/**
 * Updates the status indicators for a specific category
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 * @param {boolean} isUploaded - Whether the file has been uploaded
 */
function updateStatus(type, isUploaded) {
  // Update step indicator
  const stepNumber = getStepNumberFromType(type)
  updateStepIndicator(stepNumber, isUploaded)
}

/**
 * Updates the submit button state based on upload status
 */
function updateSubmitButton() {
  const submitBtn = document.getElementById("submitAllBtn")
  const allUploaded = uploadStatus.fe1 && uploadStatus.fe2 && uploadStatus.agency && uploadStatus.sessional

  submitBtn.disabled = !allUploaded

  if (allUploaded) {
    submitBtn.classList.add("btn-accent")
    submitBtn.classList.remove("btn-primary")
  } else {
    submitBtn.classList.remove("btn-accent")
    submitBtn.classList.add("btn-primary")
  }
}

async function geocodeLocation(location) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?country=au&limit=1&access_token=${mapboxToken}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    const [lon, lat] = data.features[0]?.geometry?.coordinates || [null, null]
    return { lat, lon }
  } catch (error) {
    console.error("Geocoding failed:", error)
    return { lat: null, lon: null }
  }
}

function getFirestoreCollectionName(type) {
  switch (type) {
    case "fe1":
      return "fe1_students"
    case "fe2":
      return "fe2_students"
    case "agency":
      return "agencies"
    case "sessional":
      return "sessional_staff"
    default:
      return "uploads"
  }
}

async function processAndUploadExcel(file, type, progressCallback) {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet)
  const collectionName = getFirestoreCollectionName(type)
  const colRef = collection(db, collectionName)

  try {
    // Step 1: Only delete if collection has documents (10% progress)
    progressCallback(10)
    const existingDocs = await getDocs(colRef)
    if (!existingDocs.empty) {
      const deletePromises = existingDocs.docs.map((d) => deleteDoc(doc(db, collectionName, d.id)))
      await Promise.all(deletePromises)
      console.log(`Cleared existing documents from ${collectionName}`)
    }

    // Step 2: Upload new docs with progress updates
    progressCallback(20)

    const totalRows = rows.length
    let processedRows = 0

    for (const row of rows) {
      const location = row["Location"] || ""
      const { lat, lon } = await geocodeLocation(location)

      const record = {
        ...row,
        latitude: lat,
        longitude: lon,
        uploadedAt: new Date().toISOString(),
      }

      await addDoc(colRef, record)

      // Update progress after each row
      processedRows++
      const progress = 20 + Math.floor((processedRows / totalRows) * 80)
      progressCallback(Math.min(progress, 99)) // Cap at 99% until fully complete
    }

    console.log(`Uploaded new records to ${collectionName}`)
    progressCallback(100)
    return true
  } catch (error) {
    console.error(`Failed to process ${collectionName}:`, error)
    return false
  }
}

async function submitAllFiles() {
  if (uploadStatus.fe1 && uploadStatus.fe2 && uploadStatus.agency && uploadStatus.sessional) {
    // Get the submit button and add spinner
    const submitBtn = document.getElementById("submitAllBtn")
    const originalBtnText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...'

    // Create a modal for showing overall progress
    const modalHtml = `
      <div class="modal fade" id="uploadProgressModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="uploadProgressModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="uploadProgressModalLabel">Uploading Files</h5>
            </div>
            <div class="modal-body">
              <p id="currentFileText">Processing FE1 Students...</p>
              <div class="progress mb-3">
                <div id="currentFileProgress" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <p>Overall Progress:</p>
              <div class="progress">
                <div id="overallProgress" class="progress-bar bg-success progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Add modal to document
    const modalContainer = document.createElement("div")
    modalContainer.innerHTML = modalHtml
    document.body.appendChild(modalContainer)

    // Show the modal
    const progressModal = new bootstrap.Modal(document.getElementById("uploadProgressModal"))
    progressModal.show()

    // Get progress elements
    const currentFileText = document.getElementById("currentFileText")
    const currentFileProgress = document.getElementById("currentFileProgress")
    const overallProgress = document.getElementById("overallProgress")

    try {
      const fileTypes = ["fe1", "fe2", "agency", "sessional"]
      const fileLabels = {
        fe1: "FE1 Students",
        fe2: "FE2 Students",
        agency: "Agencies",
        sessional: "Sessional Staff",
      }

      let overallPercent = 0

      for (let i = 0; i < fileTypes.length; i++) {
        const type = fileTypes[i]
        const file = uploadedFiles[type]

        if (file) {
          // Update text and reset current file progress
          currentFileText.textContent = `Processing ${fileLabels[type]}...`
          currentFileProgress.style.width = "0%"
          currentFileProgress.setAttribute("aria-valuenow", 0)

          // Process and upload the file with progress updates
          await processAndUploadExcel(file, type, (percent) => {
            // Update current file progress
            currentFileProgress.style.width = `${percent}%`
            currentFileProgress.setAttribute("aria-valuenow", percent)

            // Update overall progress
            const fileWeight = 100 / fileTypes.length
            const fileContribution = (percent / 100) * fileWeight
            const baseProgress = (i / fileTypes.length) * 100
            overallPercent = baseProgress + fileContribution

            overallProgress.style.width = `${overallPercent}%`
            overallProgress.setAttribute("aria-valuenow", overallPercent)
          })
        }
      }

      // All files processed successfully
      currentFileText.textContent = "All files processed successfully!"
      currentFileProgress.style.width = "100%"
      currentFileProgress.setAttribute("aria-valuenow", 100)
      overallProgress.style.width = "100%"
      overallProgress.setAttribute("aria-valuenow", 100)

      // Change progress bar styles to success
      currentFileProgress.classList.remove("progress-bar-animated")
      currentFileProgress.classList.add("bg-success")
      overallProgress.classList.remove("progress-bar-animated")

      // Wait a moment to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Hide modal and show success message
      progressModal.hide()
      alert("All files have been successfully uploaded to Firestore!")

      // Redirect to map page
      window.location.href = "map-filter.html"
    } catch (error) {
      console.error("Error uploading files:", error)

      // Hide modal and show error
      progressModal.hide()
      alert("An error occurred while uploading. Please try again.")

      // Reset button
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
    }
  } else {
    alert("Please upload all required files before submitting.")
  }
}

/**
 * Gets the step number from the upload type
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 * @returns {number} - The step number
 */
function getStepNumberFromType(type) {
  switch (type) {
    case "fe1":
      return 1
    case "fe2":
      return 2
    case "agency":
      return 3
    case "sessional":
      return 4
    default:
      return 1
  }
}

/**
 * Gets the upload type from the step number
 * @param {number} stepNumber - The step number
 * @returns {string} - The upload type
 */
function getTypeFromStepNumber(stepNumber) {
  switch (stepNumber) {
    case 1:
      return "fe1"
    case 2:
      return "fe2"
    case 3:
      return "agency"
    case 4:
      return "sessional"
    default:
      return "fe1"
  }
}

/**
 * Updates the step indicator
 * @param {number} stepNumber - The step number to update
 * @param {boolean} completed - Whether the step is completed
 */
function updateStepIndicator(stepNumber, completed = false) {
  // Update all steps
  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById(`step${i}`)

    // Reset classes
    step.classList.remove("active", "completed")

    // Set active class for current step
    if (i === currentStep) {
      step.classList.add("active")
    }

    // Set completed class for completed steps
    if (i < currentStep || (i === stepNumber && completed)) {
      step.classList.add("completed")

      // Change circle to checkmark
      const circle = step.querySelector(".step-circle")
      circle.innerHTML = '<i class="bi bi-check-lg"></i>'
    } else {
      // Reset to number
      const circle = step.querySelector(".step-circle")
      circle.innerHTML = i
    }
  }
}

/**
 * Goes to the next step in the upload process
 * @param {number} currentStepNumber - The current step number
 */
function goToNextStep(currentStepNumber) {
  if (currentStepNumber >= 4) return

  // Hide current section
  document.getElementById(`section${currentStepNumber}`).classList.remove("active")

  // Show next section
  const nextStep = currentStepNumber + 1
  document.getElementById(`section${nextStep}`).classList.add("active")

  // Update current step
  currentStep = nextStep

  // Update step indicator
  updateStepIndicator(nextStep)
}

/**
 * Goes to the previous step in the upload process
 * @param {number} currentStepNumber - The current step number
 */
function goToPreviousStep(currentStepNumber) {
  if (currentStepNumber <= 1) return

  // Hide current section
  document.getElementById(`section${currentStepNumber}`).classList.remove("active")

  // Show previous section
  const prevStep = currentStepNumber - 1
  document.getElementById(`section${prevStep}`).classList.add("active")

  // Update current step
  currentStep = prevStep

  // Update step indicator
  updateStepIndicator(prevStep)
}

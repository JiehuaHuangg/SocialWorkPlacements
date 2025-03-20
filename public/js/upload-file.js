// Track upload status for each category
const uploadStatus = {
    fe1: false,
    fe2: false,
    agency: false,
    sessional: false
};

// Set up drag and drop for all upload areas
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop('fe1');
    setupDragAndDrop('fe2');
    setupDragAndDrop('agency');
    setupDragAndDrop('sessional');
    updateSubmitButton();
});

/**
 * Sets up drag and drop functionality for a specific upload area
 * @param {string} type - The type of upload area (fe1, fe2, agency, sessional)
 */
function setupDragAndDrop(type) {
    const dropArea = document.getElementById(`${type}UploadArea`);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('bg-light');
    }
    
    function unhighlight() {
        dropArea.classList.remove('bg-light');
    }
    
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            const fileInput = document.getElementById(`${type}FileInput`);
            fileInput.files = files;
            handleFileSelect(fileInput, type);
        }
    }, false);
}

/**
 * Handles file selection from input or drag and drop
 * @param {HTMLInputElement} input - The file input element
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function handleFileSelect(input, type) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Check if file is Excel
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            alert('Please select an Excel file (.xlsx or .xls)');
            input.value = '';
            return;
        }
        
        // Display file info
        document.getElementById(`${type}FileName`).textContent = file.name;
        document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size);
        document.getElementById(`${type}FileInfo`).style.display = 'block';
        document.getElementById(`${type}UploadArea`).style.display = 'none';
        
        // Preview Excel file
        previewExcel(file, type);
    }
}

/**
 * Removes the selected file and resets the upload area
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function removeFile(type) {
    document.getElementById(`${type}FileInput`).value = '';
    document.getElementById(`${type}FileInfo`).style.display = 'none';
    document.getElementById(`${type}UploadArea`).style.display = 'block';
    document.getElementById(`${type}Preview`).innerHTML = '';
    document.getElementById(`${type}Progress`).style.display = 'none';
    document.getElementById(`${type}Progress`).querySelector('.progress-bar').style.width = '0%';
    
    // Update status
    uploadStatus[type] = false;
    updateStatus(type, false);
    updateSubmitButton();
}

/**
 * Formats file size in bytes to a human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates Excel columns against required columns
 * @param {Object} worksheet - XLSX worksheet object
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 * @returns {boolean} - Whether the columns are valid
 */
function validateExcelColumns(worksheet, type) {
    // Get the headers from the first row
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({r: range.s.r, c: C})];
        headers.push(cell ? cell.v : undefined);
    }
    
    // Define required columns for each type
    const requiredColumns = {
        fe1: [
            'Name', 'Location', 'Sector Exception', 'Interested sectors', 
            'Domestic / International', 'Driver\'s Licence', 
            'First Nations (Aboriginal & Torres Strait Islanders)', 'UWA FE Coordinators'
        ],
        fe2: [
            'Name', 'Location', 'Sector Exception', 'Interested sectors', 
            'FE1 Onsite Supervisor', 'FE 1 Sector', 'Domestic / International', 
            'Driver\'s Licence', 'First Nations (Aboriginal & Torres Strait Islanders)', 
            'UWA FE Coordinators'
        ],
        agency: [
            'Name', 'Location', 'Sector', 'Exception', 'Available spots', 
            'First Nations (Aboriginal & Torres Strait Islanders)', 'Onsite SW Supervisor'
        ],
        sessional: [
            'Name', 'Location', 'LO', 'EFE'
        ]
    };
    
    // Check if all required columns are present
    const missingColumns = requiredColumns[type].filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
        alert(`Missing required columns: ${missingColumns.join(', ')}\n\nPlease check the "Required Columns" for the correct format.`);
        return false;
    }
    
    return true;
}

/**
 * Previews Excel file content in a table
 * @param {File} file - The Excel file to preview
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function previewExcel(file, type) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        /* global XLSX */
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        
        // Validate columns
        if (!validateExcelColumns(worksheet, type)) {
            removeFile(type);
            return;
        }
        
        // Convert to HTML table
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: `${type}Table`, editable: false });
        
        // Display preview
        const previewDiv = document.getElementById(`${type}Preview`);
        previewDiv.innerHTML = `
            <h4 class="h6 mb-3">File Preview (Sheet: ${firstSheet})</h4>
            <div class="table-responsive">
                ${htmlTable}
            </div>
        `;
        
        // Style the table
        const table = document.getElementById(`${type}Table`);
        if (table) {
            table.classList.add('table', 'table-striped', 'table-bordered', 'table-hover', 'table-sm');
            table.style.width = '100%';
            
            // Style the header row
            const thead = table.querySelector('thead');
            if (thead) {
                thead.classList.add('table-primary');
                thead.querySelectorAll('th').forEach(th => {
                    th.style.backgroundColor = '#27358C';
                    th.style.color = 'white';
                });
            }
        }
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Simulates file upload with progress bar
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 */
function uploadFile(type) {
    const progressBar = document.getElementById(`${type}Progress`).querySelector('.progress-bar');
    document.getElementById(`${type}Progress`).style.display = 'block';
    document.getElementById(`${type}UploadBtn`).disabled = true;
    
    let width = 0;
    const interval = setInterval(function() {
        if (width >= 100) {
            clearInterval(interval);
            setTimeout(function() {
                // Mark as uploaded
                uploadStatus[type] = true;
                updateStatus(type, true);
                updateSubmitButton();
                
                // Show success message
                let typeName = type;
                if (type === 'fe1') typeName = 'FE1 Students';
                if (type === 'fe2') typeName = 'FE2 Students';
                if (type === 'agency') typeName = 'Agency';
                if (type === 'sessional') typeName = 'Sessional Staff';
                
                alert(`${typeName} Excel file uploaded successfully!`);
                
                // Disable the upload button but don't remove the file
                document.getElementById(`${type}UploadBtn`).disabled = true;
                document.getElementById(`${type}UploadBtn`).textContent = 'Uploaded';
            }, 500);
        } else {
            width += 5;
            progressBar.style.width = width + '%';
            progressBar.setAttribute('aria-valuenow', width);
        }
    }, 100);
}

/**
 * Updates the status indicators for a specific category
 * @param {string} type - The type of upload (fe1, fe2, agency, sessional)
 * @param {boolean} isUploaded - Whether the file has been uploaded
 */
function updateStatus(type, isUploaded) {
    // Update tab indicator
    const statusElement = document.getElementById(`${type}Status`);
    statusElement.textContent = isUploaded ? '✅' : '⚠️';
    
    // Update summary card
    const statusIcon = document.getElementById(`${type}StatusIcon`);
    const statusText = document.getElementById(`${type}StatusText`);
    
    statusIcon.textContent = isUploaded ? '✅' : '⚠️';
    statusText.textContent = isUploaded ? 'Uploaded successfully' : 'Not uploaded';
    
    if (isUploaded) {
        statusText.classList.remove('text-muted');
        statusText.classList.add('text-success');
    } else {
        statusText.classList.remove('text-success');
        statusText.classList.add('text-muted');
    }
}

/**
 * Updates the submit button state based on upload status
 */
function updateSubmitButton() {
    const submitBtn = document.getElementById('submitAllBtn');
    const allUploaded = uploadStatus.fe1 && uploadStatus.fe2 && uploadStatus.agency && uploadStatus.sessional;
    
    submitBtn.disabled = !allUploaded;
    
    if (allUploaded) {
        submitBtn.classList.add('btn-accent');
        submitBtn.classList.remove('btn-primary');
    } else {
        submitBtn.classList.remove('btn-accent');
        submitBtn.classList.add('btn-primary');
    }
}

/**
 * Handles the final submission of all files
 */
function submitAllFiles() {
    if (uploadStatus.fe1 && uploadStatus.fe2 && uploadStatus.agency && uploadStatus.sessional) {
        // In a real application, you would process all files here
        // For this example, we'll just show a success message
        alert('All files have been successfully submitted!');
        
        // You could redirect to a confirmation page or reset the form
        // window.location.href = 'confirmation.html';
    } else {
        alert('Please upload all required files before submitting.');
    }
}
import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { db } from "./firebase-config.js"


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

    // Remove button
    const removeBtn = document.querySelector(`#${type}FileInfo .btn-outline-danger`)
    if (removeBtn) {
      removeBtn.addEventListener("click", () => removeFile(type))
    }

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
  document.getElementById(`${type}FileInput`).value = ""
  document.getElementById(`${type}FileInfo`).style.display = "none"
  document.getElementById(`${type}UploadArea`).style.display = "block"
  document.getElementById(`${type}Preview`).innerHTML = ""
  document.getElementById(`${type}Progress`).style.display = "none"
  document.getElementById(`${type}Progress`).querySelector(".progress-bar").style.width = "0%"

  // Update status
  uploadStatus[type] = false
  updateStatus(type, false)
  updateSubmitButton()

  // Disable next button
  document.getElementById(`${type}NextBtn`).disabled = true

  // Remove the file from uploadedFiles
  uploadedFiles[type] = null
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
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}&limit=1`
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

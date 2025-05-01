// Firebase CDN imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js"
import { collection, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js"


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
  authDomain: "social-work-placement.firebaseapp.com",
  projectId: "social-work-placement",
  storageBucket: "social-work-placement.firebasestorage.app",
  messagingSenderId: "465758786519",
  appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
}

// Mapbox token
const MAPBOX_TOKEN = "pk.eyJ1IjoiYWxhbjAwNyIsImEiOiJjbTd5MGFtcTkwNHIyMndxYm85czZjcnc0In0.61fFzlPTeu4vErDSO8-MVA"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Global variables
let map
let markers = []
let fe1_students = []
let fe2_students = []
let agencies = []
let sessional_staff = []
let stakeholders = [] // inorder to perform combination of all stakeholders
let filters = {
  stakeholderType: ["all"],
  driverLicence: "all",
  studentType: "all",
  region: ["all"],
  gender: "all",
  placementYear: "all",
  interest: ["all"],
  search: "",
}

// function extract suburb from address: call fucntion
function extractSuburb(address) {
  if (!address) return "Unknown"

  // extract suburb from address format like "Street, Suburb WA Postcode"address format
  const parts = address.split(",")
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].trim()
    // case 1:extract suburb from "Suburb WA Postcode" format
    const suburbMatch = lastPart.match(/([a-zA-Z\s]+)\s+WA\s+\d+/)
    if (suburbMatch && suburbMatch[1]) {
      return suburbMatch[1].trim()
    }

    // case 2:if no postcode, try to extract suburb from "Suburb WA" format
    const simpleMatch = lastPart.match(/([a-zA-Z\s]+)\s+WA/)
    if (simpleMatch && simpleMatch[1]) {
      return simpleMatch[1].trim()
    }
    // case 3:If no WA indicator, just return the last part as suburb
    return lastPart
  }
  return "Unknown"
}

// function to determine region based on coordinates: call function
function determineRegion(lat, lng) {
  // Perth coordinates as reference point
  const perthLat = -31.9523
  const perthLng = 115.8613

  // define region boundaries buffer value 30 km morethan or lessthan means any cardinal symbol
  if (lat < perthLat - 0.3) {
    return "South"
  } else if (lat > perthLat + 0.3) {
    return "North"
  } else if (lng < perthLng - 0.3) {
    return "East"
  } else if (lng > perthLng + 0.3) {
    return "West"
  } else if (Math.abs(lat - perthLat) <= 0.3 && Math.abs(lng - perthLng) <= 0.3) {
    return "Central"
  } else {
    return "Rural"
  }
}

// fetch from FE1 Students collection
async function fetchFE1Students() {
  try {
    const snapshot = await getDocs(collection(db, "fe1_students"))
    const students = []
    snapshot.forEach((doc) => {
      const student = doc.data()
      student.id = doc.id
      student.stakeholderType = "fe1_students"
      students.push(student)
    })

    console.log(`Fetched ${students.length} FE1 students`)
    return students
  } catch (error) {
    console.error("Error fetching FE1 students:", error)
    return []
  }
}

// Fetch from FE2 Students collection
async function fetchFE2Students() {
  try {
    const snapshot = await getDocs(collection(db, "fe2_students"))
    const students = []
    snapshot.forEach((doc) => {
      const student = doc.data()
      student.id = doc.id
      student.stakeholderType = "fe2_students"
      students.push(student)
    })

    console.log(`Fetched ${students.length} FE2 students`)
    return students
  } catch (error) {
    console.error("Error fetching FE2 students:", error)
    return []
  }
}

// fetch from Agencies collection
async function fetchAgencies() {
  try {
    const snapshot = await getDocs(collection(db, "agencies"))
    const agencyList = []
    snapshot.forEach((doc) => {
      const agency = doc.data()
      agency.id = doc.id
      agency.stakeholderType = "agencies"
      agencyList.push(agency)
    })
    console.log(`Fetched ${agencyList.length} agencies`)
    return agencyList
  } catch (error) {
    console.error("Error fetching agencies:", error)
    return []
  }
}

// fetch from Sessional Staff collection
async function fetchSessionalStaff() {
  try {
    const snapshot = await getDocs(collection(db, "sessional_staff"))
    const staffList = []

    snapshot.forEach((doc) => {
      const staff = doc.data()
      staff.id = doc.id
      staff.stakeholderType = "sessional_staff"
      staffList.push(staff)
    })

    console.log(`Fetched ${staffList.length} sessional staff`)
    return staffList
  } catch (error) {
    console.error("Error fetching sessional staff:", error)
    return []
  }
}

// Extract unique sectors from all stakeholders
function extractUniqueSectors() {
  const allSectors = new Set()
  // Extract from FE1 students
  fe1_students.forEach((student) => {
    if (student["Interested sectors"]) {
      //delimiter is ";"
      const sectors = student["Interested sectors"].split(";").map((s) => s.trim())
      sectors.forEach((sector) => {
        if (sector) allSectors.add(sector)
      })
    }
  })

  // Extract from FE2 students
  fe2_students.forEach((student) => {
    if (student["Interested sectors"]) {
            //delimiter is ";"
      const sectors = student["Interested sectors"].split(";").map((s) => s.trim())
      sectors.forEach((sector) => {
        if (sector) allSectors.add(sector)
      })
    }
  })

  // Extract from agencies
  agencies.forEach((agency) => {
    if (agency["Sector"]) {
      allSectors.add(agency["Sector"].trim())
    }
  })
  return Array.from(allSectors).sort()
}

//insert the unique interest from each stakholder to the UI
function renderInterestFilters(sectors) {
  const container = document.getElementById("interest-filters")
  if (!container) return

  container.innerHTML = ""

  const allDiv = document.createElement("div")
  allDiv.className = "filter-option active"
  allDiv.dataset.interest = "all"
  allDiv.textContent = "All"
  container.appendChild(allDiv)

  sectors.forEach((sector) => {
    const div = document.createElement("div")
    div.className = "filter-option"
    div.dataset.interest = sector.toLowerCase()
    div.textContent = sector//save as actual name
    container.appendChild(div)//append changes to the container element
  })
}

// Process all stakeholders for display
function processStakeholders() {
  stakeholders = []

  // Process FE1 students
  fe1_students.forEach((student) => {
    const suburb = extractSuburb(student["Location"])//function call suburb selection
    const region = determineRegion(student.latitude, student.longitude)//function call for region

    // Extract interested sectors as array
    let sectors = []
    if (student["Interested sectors"]) {
      sectors = student["Interested sectors"].split(";").map((s) => s.trim())
    }

    // Extract sector exceptions as array
    let exceptions = []
    if (student["Sector Exception"]) {
      exceptions = student["Sector Exception"].split(";").map((s) => s.trim())
    }
//actual value is not present default value added
    stakeholders.push({
      id: student.id,
      name: student["Name"] || "Unknown Student",
      stakeholderType: "fe1_students",
      location: [student.longitude, student.latitude],
      address: student["Location"] || "",
      suburb: suburb,
      region: region,
      driversLicence: student["Driver's Licence"] || "No",
      studentType: student["Domestic / International"] || "Domestic",
      gender: student["Gender"] || "",
      firstNation: student["First Nation Students"] || "No",
      coordinator: student["UWA FE Coordinators"] || "",
      sectors: sectors,
      exceptions: exceptions,
    })
  })

  // Process FE2 students
  fe2_students.forEach((student) => {
    const suburb = extractSuburb(student["Location"])
    const region = determineRegion(student.latitude, student.longitude)

    // Extract interested sectors as array
    let sectors = []
    if (student["Interested sectors"]) {
      sectors = student["Interested sectors"].split(";").map((s) => s.trim())
    }

    // Extract sector exceptions as array
    let exceptions = []
    if (student["Sector Exception"]) {
      exceptions = student["Sector Exception"].split(";").map((s) => s.trim())
    }

    stakeholders.push({
      id: student.id,
      name: student["Name"] || "Unknown Student",
      stakeholderType: "fe2_students",
      location: [student.longitude, student.latitude],
      address: student["Location"] || "",
      suburb: suburb,
      region: region,
      driversLicence: student["Driver's Licence"] || "No",
      studentType: student["Domestic / International"] || "Domestic",
      gender: student["Gender"] || "",
      firstNation: student["First Nation Students"] || "No",
      fe1Sector: student["FE 1 Sector"] || "",
      fe1Supervisor: student["FE1 Onsite Supervisor"] || "No",
      coordinator: student["UWA FE Coordinators"] || "",
      sectors: sectors,
      exceptions: exceptions,
    })
  })

  // Process agencies
  agencies.forEach((agency) => {
    const suburb = extractSuburb(agency["Location"])
    const region = determineRegion(agency.latitude, agency.longitude)

    stakeholders.push({
      id: agency.id,
      name: agency["Name"] || "Unknown Agency",
      stakeholderType: "agencies",
      location: [agency.longitude, agency.latitude],
      address: agency["Location"] || "",
      suburb: suburb,
      region: region,
      sector: agency["Sector"] || "",
      availableSpots: agency["Available spots"] || 0,
      supervisor: agency["Onsite SW Supervisor"] || "No",
      exception: agency["Exception"] || "",
    })
  })

  // Process sessional staff
  sessional_staff.forEach((staff) => {
    const suburb = extractSuburb(staff["Location"])
    const region = determineRegion(staff.latitude, staff.longitude)

    stakeholders.push({
      id: staff.id,
      name: staff["Name"] || "Unknown Staff",
      stakeholderType: "sessional_staff",
      location: [staff.longitude, staff.latitude],
      address: staff["Location"] || "",
      suburb: suburb,
      region: region,
      efe: staff["EFE"] || 0,
      lo: staff["LO"] || 0,
    })
  })

  console.log(`Processed ${stakeholders.length} total stakeholders`)
}

// Initialize Mapbox map
function initializeMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [115.8613, -31.9523], // Perth, Australia
    zoom: 9,
  })

  // add navigation controls
  map.addControl(new mapboxgl.NavigationControl(), "bottom-right")

  // Wait for map to load before adding markers
  map.on("load", () => {
    console.log("Map loaded")
    addMarkers()
  })
}

// Set up event listeners for all filter elements
function setupFilterListeners() {
  // Stakeholder type checkboxes
  document.querySelectorAll('.filter-group input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.id === "all" && checkbox.checked) {
        // If "All" is checked, uncheck others
        document.querySelectorAll('.filter-group input[type="checkbox"]').forEach((cb) => {
          if (cb.id !== "all") cb.checked = false
        })
      } else if (checkbox.checked) {
        // If any other checkbox is checked, uncheck "All"
        const allCheckbox = document.getElementById("all")
        if (allCheckbox) allCheckbox.checked = false
      }

      // If no checkbox is checked, check "All"
      const anyChecked = [...document.querySelectorAll('.filter-group input[type="checkbox"]')].some((cb) => cb.checked)
      if (!anyChecked) {
        const allCheckbox = document.getElementById("all")
        if (allCheckbox) allCheckbox.checked = true
      }

      updateFilters()
      addMarkers()
    })
  })

  // Radio buttons (Drivers License, Student Type, Gender, Placement Year)
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updateFilters()
      addMarkers()
    })
  })

  // Region filters
  document.querySelectorAll("#region-filters .filter-option").forEach((option) => {
    option.addEventListener("click", function () {
      const isAll = this.dataset.region === "all"
      const options = document.querySelectorAll("#region-filters .filter-option")

      if (isAll) {
        // deselect all others
        options.forEach((opt) => opt.classList.remove("active"))
        this.classList.add("active")
      } else {
        // deselect "All" if its selected
        const allOption = document.querySelector('#region-filters [data-region="all"]')
        if (allOption) allOption.classList.remove("active")

        // Toggle current option
        this.classList.toggle("active")
      }

      // none selected, default back to "All"
      const anySelected = [...options].some((opt) => opt.dataset.region !== "all" && opt.classList.contains("active"))
      if (!anySelected) {
        const allOption = document.querySelector('#region-filters [data-region="all"]')
        if (allOption) allOption.classList.add("active")
      }

      updateFilters()
      addMarkers()
    })
  })

  // Interest filters
  document.querySelector("#interest-filters").addEventListener("click", (e) => {
    if (!e.target.classList.contains("filter-option")) return

    const isAll = e.target.dataset.interest === "all"
    const options = document.querySelectorAll("#interest-filters .filter-option")

    if (isAll) {
      // deselect all others
      options.forEach((opt) => opt.classList.remove("active"))
      e.target.classList.add("active")
    } else {
      // deselect "All" if it's selected
      const allOption = document.querySelector('#interest-filters [data-interest="all"]')
      if (allOption) allOption.classList.remove("active")

      // Toggle current option
      e.target.classList.toggle("active")
    }

    // none selected, default back to "All"
    const anySelected = [...options].some((opt) => opt.dataset.interest !== "all" && opt.classList.contains("active"))
    if (!anySelected) {
      const allOption = document.querySelector('#interest-filters [data-interest="all"]')
      if (allOption) allOption.classList.add("active")
    }

    updateFilters()
    addMarkers()
  })

  // Search form
  const searchForm = document.querySelector("form")
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault()
      updateFilters()
      addMarkers()
    })
  }

  // real-time filtering on search input
  const searchInput = document.querySelector(".search-input")
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      updateFilters()
      addMarkers()
    })
  }

  // Reset button
  const resetBtn = document.getElementById("reset-btn")
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllFilters)
  }
}

// Update the filters object based on UI selections
function updateFilters() {
  // Stakeholder Type (checkboxes)
  const stakeholderTypes = []
  if (document.getElementById("all") && document.getElementById("all").checked) {
    stakeholderTypes.push("all")
  } else {
    if (document.getElementById("fe1_students") && document.getElementById("fe1_students").checked)
      stakeholderTypes.push("fe1_students")
    if (document.getElementById("fe2_students") && document.getElementById("fe2_students").checked)
      stakeholderTypes.push("fe2_students")
    if (document.getElementById("agencies") && document.getElementById("agencies").checked)
      stakeholderTypes.push("agencies")
    if (document.getElementById("sessional_staff") && document.getElementById("sessional_staff").checked)
      stakeholderTypes.push("sessional_staff")
  }

  // If no stakeholder types are selected, default to "all"
  if (stakeholderTypes.length === 0) {
    stakeholderTypes.push("all")
  }

  // Driver's License (radio)
  let driverLicence = "all"
  if (document.getElementById("international")?.checked) driverLicence = "international"
  else if (document.getElementById("australian")?.checked) driverLicence = "australian"
  else if (document.getElementById("no_licence")?.checked) driverLicence = "no"

  // Student Type (radio)
  let studentType = "all"
  if (document.getElementById("international_student")?.checked) studentType = "international"
  else if (document.getElementById("domestic_student")?.checked) studentType = "domestic"
  else if (document.getElementById("first_nation")?.checked) studentType = "first nation"

  // Region (multiple select)
  const regions = []
  const regionOptions = document.querySelectorAll("#region-filters .filter-option.active")
  regionOptions.forEach((option) => {
    regions.push(option.dataset.region.toLowerCase())//compare as lowercase values
  })

  // If no regions are selected, default to "all"
  if (regions.length === 0) {
    regions.push("all")
  }

  // Gender (radio)
  let gender = "all"
  if (document.getElementById("male")?.checked) gender = "male"
  else if (document.getElementById("female")?.checked) gender = "female"

  // Interests (multiple select)
  const interests = []
  const interestOptions = document.querySelectorAll("#interest-filters .filter-option.active")
  interestOptions.forEach((option) => {
    interests.push(option.dataset.interest.toLowerCase())
  })

  // If no interests are selected, default to "all"
  if (interests.length === 0) {
    interests.push("all")
  }

  // Search
  const search = document.querySelector(".search-input")?.value || ""

  // Update global filters object
  filters = {
    stakeholderType: stakeholderTypes,
    driverLicence: driverLicence,
    studentType: studentType,
    region: regions,
    gender: gender,
    interest: interests,
    search: search,
  }

  console.log("Updated filters:", filters)
}

// Create marker element based on stakeholder type
function createMarkerElement(stakeholder) {
  const el = document.createElement("div")
  el.className = "marker"

  // Set marker style based on stakeholder type
  if (stakeholder.stakeholderType === "fe1_students") {
    el.classList.add("marker-fe1")
  } else if (stakeholder.stakeholderType === "fe2_students") {
    el.classList.add("marker-fe2")
  } else if (stakeholder.stakeholderType === "agencies") {
    el.classList.add("marker-agency")
    // insert capacity number if available
    if (stakeholder.availableSpots && stakeholder.availableSpots > 0) {
      el.textContent = stakeholder.availableSpots
    }
  } else if (stakeholder.stakeholderType === "sessional_staff") {
    el.classList.add("marker-staff")
  }

  return el
}

// Create popup content based on stakeholder type
function createPopupContent(stakeholder) {
  let content = `
    <div class="popup-title">${stakeholder.name}</div>
  `
  // Add type badge
  let typeName = ""
  switch (stakeholder.stakeholderType) {
    case "fe1_students":
      typeName = "FE1 Student"
      break
    case "fe2_students":
      typeName = "FE2 Student"
      break
    case "agencies":
      typeName = "Agency"
      break
    case "sessional_staff":
      typeName = "Sessional Staff"
      break
  }

  content += `<div class="popup-type">${typeName}</div>`

  // Add location info
  content += `
    <div class="popup-info"><strong>Address:</strong> ${stakeholder.address || "N/A"}</div>
    <div class="popup-info"><strong>Suburb:</strong> ${stakeholder.suburb || "Unknown"}</div>
    <div class="popup-info"><strong>Region:</strong> ${stakeholder.region || "Unknown"}</div>
  `

  // Add type-specific information
  if (stakeholder.stakeholderType === "fe1_students" || stakeholder.stakeholderType === "fe2_students") {
    content += `
      <div class="popup-section">
        <div class="popup-info"><strong>Student Type:</strong> ${stakeholder.studentType || "N/A"}</div>
        <div class="popup-info"><strong>Driver's License:</strong> ${stakeholder.driversLicence || "N/A"}</div>
        <div class="popup-info"><strong>Gender:</strong> ${stakeholder.gender || "N/A"}</div>
        <div class="popup-info"><strong>First Nation:</strong> ${stakeholder.firstNation || "No"}</div>
        <div class="popup-info"><strong>UWA Coordinator:</strong> ${stakeholder.coordinator || "N/A"}</div>
    `

    // Add FE2 specific info
    if (stakeholder.stakeholderType === "fe2_students") {
      content += `
        <div class="popup-info"><strong>FE1 Sector:</strong> ${stakeholder.fe1Sector || "N/A"}</div>
        <div class="popup-info"><strong>FE1 Supervisor:</strong> ${stakeholder.fe1Supervisor || "No"}</div>
      `
    }

    // Add sectors
    if (stakeholder.sectors && stakeholder.sectors.length > 0) {
      content += `<div class="popup-info"><strong>Interested Sectors:</strong> ${stakeholder.sectors.join(", ")}</div>`
    }

    // Add exceptions
    if (stakeholder.exceptions && stakeholder.exceptions.length > 0) {
      content += `<div class="popup-info"><strong>Sector Exceptions:</strong> ${stakeholder.exceptions.join(", ")}</div>`
    }

    content += `</div>`
  } else if (stakeholder.stakeholderType === "agencies") {
    content += `
      <div class="popup-section">
        <div class="popup-info"><strong>Sector:</strong> ${stakeholder.sector || "N/A"}</div>
        <div class="popup-info"><strong>Available Spots:</strong> ${stakeholder.availableSpots || "0"}</div>
        <div class="popup-info"><strong>Onsite SW Supervisor:</strong> ${stakeholder.supervisor || "No"}</div>
        <div class="popup-info"><strong>Exception:</strong> ${stakeholder.exception || "None"}</div>
      </div>
    `
  } else if (stakeholder.stakeholderType === "sessional_staff") {
    content += `
      <div class="popup-section">
        <div class="popup-info"><strong>EFE:</strong> ${stakeholder.efe || "0"}</div>
        <div class="popup-info"><strong>LO:</strong> ${stakeholder.lo || "0"}</div>
      </div>
    `
  }

  return content
}

// Add markers to the map based on current filters
function addMarkers() {
  // Make sure map is initialized
  if (!map) {
    console.warn("Map not initialized yet")
    return
  }

  // Clear existing markers
  markers.forEach((marker) => marker.remove())
  markers = []

  // Filter stakeholders based on current filters
  const filteredStakeholders = stakeholders.filter((stakeholder) => {
    // Skip stakeholders without location
    if (
      !stakeholder.location ||
      !Array.isArray(stakeholder.location) ||
      stakeholder.location.length !== 2 ||
      !stakeholder.location.every((coord) => typeof coord === "number")
    ) {
      return false
    }

    // Stakeholder type filter
    const typeMatch =
      filters.stakeholderType.includes("all") || filters.stakeholderType.includes(stakeholder.stakeholderType)

    // Region filter
    const regionMatch =
      filters.region.includes("all") ||
      (stakeholder.region && filters.region.includes(stakeholder.region.toLowerCase()))

    // Interest/Sector filter
    let interestMatch = filters.interest.includes("all")

    if (!interestMatch) {
      if (stakeholder.stakeholderType === "fe1_students" || stakeholder.stakeholderType === "fe2_students") {
        // For students, check if any of their sectors match the selected interests
        interestMatch = stakeholder.sectors?.some((sector) => filters.interest.includes(sector.toLowerCase()))
      } else if (stakeholder.stakeholderType === "agencies") {
        // For agencies, check if their sector matches any selected interest
        interestMatch = stakeholder.sector && filters.interest.includes(stakeholder.sector.toLowerCase())
      } else {
        // For staff, always match if they're not filtered by interest
        interestMatch = true
      }
    }

    // Driver's License filter (only applies to students)
    const licenceMatch =
      filters.driverLicence === "all" ||
      (stakeholder.stakeholderType !== "fe1_students" && stakeholder.stakeholderType !== "fe2_students") ||
      (stakeholder.driversLicence &&
        stakeholder.driversLicence.toLowerCase().includes(filters.driverLicence.toLowerCase()))

    // Student Type filter (only applies to students)
    let studentTypeMatch =
      filters.studentType === "all" ||
      (stakeholder.stakeholderType !== "fe1_students" && stakeholder.stakeholderType !== "fe2_students")

    if (!studentTypeMatch) {
      if (filters.studentType === "first nation") {
        // Special handling for First Nation students
        studentTypeMatch = stakeholder.firstNation && stakeholder.firstNation.toLowerCase() === "yes"
      } else {
        // Regular student type matching
        studentTypeMatch =
          stakeholder.studentType && stakeholder.studentType.toLowerCase().includes(filters.studentType.toLowerCase())
      }
    }

    // Gender filter (only applies to students)
    const genderMatch =
      filters.gender === "all" ||
      (stakeholder.stakeholderType !== "fe1_students" && stakeholder.stakeholderType !== "fe2_students") ||
      (stakeholder.gender && stakeholder.gender.toLowerCase() === filters.gender.toLowerCase())

    // Search filter (name or suburb)
    const searchLower = filters.search.toLowerCase()
    const searchMatch =
      filters.search === "" ||
      (stakeholder.name && stakeholder.name.toLowerCase().includes(searchLower)) ||
      (stakeholder.suburb && stakeholder.suburb.toLowerCase().includes(searchLower))

    return (
      typeMatch &&
      regionMatch &&
      interestMatch &&
      licenceMatch &&
      studentTypeMatch &&
      genderMatch &&
      searchMatch
    )
  })

  console.log(`Showing ${filteredStakeholders.length} of ${stakeholders.length} stakeholders after filtering`)

  // Add markers for filtered stakeholders
  filteredStakeholders.forEach((stakeholder) => {
    // Create marker element
    const el = createMarkerElement(stakeholder)

    // Create popup content
    const popupContent = createPopupContent(stakeholder)
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)

    // Add marker to map
    const marker = new mapboxgl.Marker(el).setLngLat(stakeholder.location).setPopup(popup).addTo(map)

    // Store in marker array
    markers.push(marker)
  })

  // If no markers are visible after filtering, show a notification
  if (filteredStakeholders.length === 0) {
    showNotification("No stakeholders match the current filters")
  }
}

// Show notification
function showNotification(message) {
  // Check if notification already exists
  let notification = document.querySelector(".map-notification")

  if (!notification) {
    // Create notification element
    notification = document.createElement("div")
    notification.className = "map-notification"
    notification.style.cssText = `
      position: absolute;
      top: 190px;
      left: 50%;
      transform: translateX(-50%);
      background-color: white;
      padding: 10px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 100;
      font-size: 14px;
    `
    document.body.appendChild(notification)
  }

  // Set message
  notification.textContent = message

  // auto-hide after 3 seconds
  setTimeout(() => {
    notification.remove()
  }, 3000)
}


// Reset all filters to default values
document.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.querySelector('.reset-filters-button') || document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }
});

function resetAllFilters() {
  // Reset stakeholder type checkboxes
  if (document.getElementById('all')) {
    document.getElementById('all').checked = true;
  }
  document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => {
    if (cb.id !== 'all') cb.checked = false;
  });
  
  // Reset radio buttons
  const radioGroups = ['licence', 'studenttype', 'gender', 'placementyear'];
  radioGroups.forEach(group => {
    const radios = document.querySelectorAll(`input[name="${group}"]`);
    if (radios.length > 0) {
      radios[0].checked = true;
    }
  });
  
  // Reset region filters
  document.querySelectorAll('#region-filters .filter-option').forEach(option => {
    option.classList.remove('active');
  });
  const allRegion = document.querySelector('#region-filters [data-region="all"]');
  if (allRegion) {
    allRegion.classList.add('active');
  }

  // Reset interest filters
  document.querySelectorAll('#interest-filters .filter-option').forEach(option => {
    option.classList.remove('active');
  });
  const allInterest = document.querySelector('#interest-filters [data-interest="all"]');
  if (allInterest) {
    allInterest.classList.add('active');
  }
  // Reset search
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  // Update filters and markers
  updateFilters();
  addMarkers();
  
  // Show notification
  showNotification("Filters have been reset");
}
// Main initialization function
async function init() {
  try {
    console.log("Initializing application...")

    // Initialize map
    initializeMap()

    // Fetch data
    console.log("Fetching data from Firebase...")
    fe1_students = await fetchFE1Students()
    fe2_students = await fetchFE2Students()
    agencies = await fetchAgencies()
    sessional_staff = await fetchSessionalStaff()

    // Extract and render sectors/interests
    const sectors = extractUniqueSectors()
    renderInterestFilters(sectors)

    // Process stakeholders
    processStakeholders()

    // Set up filter listeners
    setupFilterListeners()

    // Initial rendering of markers
    updateFilters()
    addMarkers()

    console.log("Initialization complete!")
  } catch (error) { 
    console.error("Error during initialization:", error)
    showNotification("Error initializing application. Please check console for details.")
  }
}
// Get buttons and sidebars
const toggleLeftBtn = document.getElementById("toggle-left-sidebar");
const toggleRightBtn = document.getElementById("toggle-right-sidebar");

const leftSidebar = document.getElementById("left-sidebar");
const rightSidebar = document.getElementById("right-sidebar");

// Add toggle logic
toggleLeftBtn.addEventListener("click", () => {
  leftSidebar.classList.toggle("hidden");
});

toggleRightBtn.addEventListener("click", () => {
  rightSidebar.classList.toggle("hidden");
});

// Start the application
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for the DOM to be fully ready with all elements
  setTimeout(init, 500)
})

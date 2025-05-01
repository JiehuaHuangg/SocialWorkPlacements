// Import Firebase modules
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { db } from "./firebase-config.js"
import { Notyf } from "https://cdn.jsdelivr.net/npm/notyf@3/notyf.es.js"

// Global variables
let map
let markers = []
let lines = []
let geoCache = {}
let matchedStudents = []
let unassignedStudents = []
let allAgencies = []
let locationWeight = 50 // Default weight for location (out of 100)
let sectorWeight = 50 // Default weight for sector interests (out of 100)
let notyf

// Hardcoded Mapbox access token
const mapboxToken = "pk.eyJ1IjoiYWxhbjAwNyIsImEiOiJjbTd5MGFtcTkwNHIyMndxYm85czZjcnc0In0.61fFzlPTeu4vErDSO8-MVA"

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing application...")

  // Initialize notifications
  notyf = new Notyf({
    duration: 5000,
    position: { x: "right", y: "top" },
    types: [
      {
        type: "success",
        background: "#27358C",
        icon: false,
      },
      {
        type: "error",
        background: "#dc3545",
        icon: false,
      },
    ],
  })

  // Set up weight slider
  const weightSlider = document.getElementById("weightSlider")
  weightSlider.addEventListener("input", updateWeights)

  // Add event listeners
  document.getElementById("matchButton").addEventListener("click", runMatching)
  document.getElementById("exportButton").addEventListener("click", () => {
    exportToExcel(matchedStudents, unassignedStudents, locationWeight, sectorWeight)
  })

  // Set up data source toggle
  const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]')
  dataSourceRadios.forEach((radio) => {
    radio.addEventListener("change", toggleDataSource)
  })

  // Initial toggle of data source
  toggleDataSource()

  console.log("Application initialized successfully")
})

// Toggle data source based on radio selection
function toggleDataSource() {
  const manualUpload = document.getElementById("manualUpload").checked
  const manualUploadSection = document.getElementById("manualUploadSection")

  if (manualUpload) {
    manualUploadSection.style.display = "block"
  } else {
    manualUploadSection.style.display = "none"
  }
}

// Update weights based on slider value
function updateWeights() {
  const slider = document.getElementById("weightSlider")
  locationWeight = Number.parseInt(slider.value)
  sectorWeight = 100 - locationWeight

  document.getElementById("locationWeight").textContent = `${locationWeight}%`
  document.getElementById("sectorWeight").textContent = `${sectorWeight}%`
}

// Update the initializeMap function to explicitly set width and height and ensure proper resizing
function initializeMap() {
  console.log("Initializing map with token:", mapboxToken)

  try {
    // Set the Mapbox access token
    mapboxgl.accessToken = mapboxToken

    // Check if map already exists and remove it
    if (map) {
      map.remove()
    }

    // Make sure the map container has the right dimensions
    const mapContainer = document.getElementById("map")
    const mapParent = document.getElementById("map-container")

    // Ensure the map container fills its parent
    if (mapContainer && mapParent) {
      mapContainer.style.width = "100%"
      mapContainer.style.height = "600px"
      mapContainer.style.position = "absolute"
      mapContainer.style.top = "0"
      mapContainer.style.bottom = "0"
      mapContainer.style.left = "0"
      mapContainer.style.right = "0"
    }

    // Create new map
    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/dark-v11", // Dark style
      center: [115.8605, -31.9505], // Perth, Australia (longitude, latitude)
      zoom: 10,
      width: mapParent ? mapParent.offsetWidth : undefined,
      height: mapParent ? mapParent.offsetHeight : 600,
    })

    // Add resize handler to ensure map fills container
    window.addEventListener("resize", handleMapResize)

    // Force resize after short delays to ensure container is fully rendered
    setTimeout(handleMapResize, 100)
    setTimeout(handleMapResize, 500)
    setTimeout(handleMapResize, 1000)
    setTimeout(handleMapResize, 2000)

    // Add resize handler when map loads
    map.on("load", () => {
      console.log("Map loaded, resizing...")
      handleMapResize()
    })

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), "top-right")

    // Clear markers and lines arrays
    markers = []
    lines = []

    console.log("Map initialized successfully")
    return true
  } catch (error) {
    console.error("Error initializing map:", error)
    return false
  }
}

// Improve the handleMapResize function to be more robust
function handleMapResize() {
  if (map) {
    const container = document.getElementById("map-container")
    if (container) {
      const width = container.offsetWidth
      const height = container.offsetHeight || 600
      console.log(`Resizing map to: ${width}x${height}`)

      // Force the map container to have the right dimensions
      const mapElement = document.getElementById("map")
      if (mapElement) {
        mapElement.style.width = width + "px"
        mapElement.style.height = height + "px"
      }

      map.resize()
    }
  }
}

// Fix the populateGeoCacheFromFirebase function to properly handle agency data
function populateGeoCacheFromFirebase(fe1Students, fe2Students, agencies) {
  console.log("Populating geoCache from Firebase data...")
  console.log("Agencies:", agencies.length)
  console.log("FE1 Students:", fe1Students.length)
  console.log("FE2 Students:", fe2Students.length)

  // Add agency coordinates to geoCache
  agencies.forEach((agency) => {
    if (agency.latitude && agency.longitude) {
      geoCache[agency.Location] = {
        lat: agency.latitude,
        lon: agency.longitude,
      }
      console.log(`Added agency to geoCache: ${agency.Name} at ${agency.latitude}, ${agency.longitude}`)
    } else {
      console.warn(`Missing coordinates for agency: ${agency.Name} at ${agency.Location}`)
    }
  })

  // Add student coordinates to geoCache
  ;[...fe1Students, ...fe2Students].forEach((student) => {
    if (student.latitude && student.longitude) {
      geoCache[student.Location] = {
        lat: student.latitude,
        lon: student.longitude,
      }
    }
  })

  console.log(`Populated geoCache with ${Object.keys(geoCache).length} locations from Firebase`)
}

// Update the runMatching function to ensure agencies are displayed for Firebase data
async function runMatching() {
  console.log("Starting matching process...")

  // Show loading indicator
  document.getElementById("loadingIndicator").style.display = "block"
  document.getElementById("resultsContainer").style.display = "none"

  // Initialize map
  if (!initializeMap()) {
    notyf.error("Failed to initialize map. Please check your Mapbox token.")
    document.getElementById("loadingIndicator").style.display = "none"
    return
  }

  // Clear previous results
  matchedStudents = []
  unassignedStudents = []
  geoCache = {}
  markers = []
  lines = []

  try {
    // Determine data source
    const useFirebase = document.getElementById("firebaseData").checked
    let fe1Students, fe2Students, agencies

    if (useFirebase) {
      // Fetch data from Firebase
      updateLoadingStatus("Fetching data from Firebase...")
      const data = await fetchFirebaseData()
      fe1Students = data.fe1Students
      fe2Students = data.fe2Students
      agencies = data.agencies

      console.log("Firebase data loaded:", {
        fe1Count: fe1Students.length,
        fe2Count: fe2Students.length,
        agencyCount: agencies.length,
      })

      // Populate geoCache with coordinates from Firebase
      updateLoadingStatus("Loading geocoded data from Firebase...")
      populateGeoCacheFromFirebase(fe1Students, fe2Students, agencies)

      // Add agency markers for Firebase data
      updateLoadingStatus("Adding agency markers...")
      agencies.forEach((agency) => {
        if (geoCache[agency.Location]) {
          addAgencyMarker(agency, geoCache[agency.Location])
        } else {
          console.warn(`No geocode data for agency: ${agency.Name}`)
        }
      })
    } else {
      // Get file inputs
      const sessionalStaffFile = document.getElementById("sessionalStaffFile").files[0]
      const fe1File = document.getElementById("fe1StudentsFile").files[0]
      const fe2File = document.getElementById("fe2StudentsFile").files[0]
      const agencyFile = document.getElementById("agencyFile").files[0]

      // Validate files
      if (!sessionalStaffFile || !fe1File || !fe2File || !agencyFile) {
        notyf.error("Please upload all required Excel files")
        document.getElementById("loadingIndicator").style.display = "none"
        return
      }

      // Parse Excel files
      updateLoadingStatus("Parsing Excel files...")
      ;[fe1Students, fe2Students, agencies] = await Promise.all([
        parseExcelFile(fe1File),
        parseExcelFile(fe2File),
        parseExcelFile(agencyFile),
      ])

      // Geocode addresses if not already in cache
      updateLoadingStatus("Geocoding agency addresses...")
      for (let i = 0; i < agencies.length; i++) {
        const agency = agencies[i]
        if (!geoCache[agency.Location]) {
          updateLoadingStatus(`Geocoding agency ${i + 1}/${agencies.length}: ${agency.Name}`)
          const geo = await geocodeAddress(agency.Location)
          if (geo) {
            geoCache[agency.Location] = geo
          } else {
            console.warn(`Failed to geocode agency location: ${agency.Location}`)
          }
          await sleep(200) // Respect rate limits
        }
        addAgencyMarker(agency, geoCache[agency.Location])
      }

      updateLoadingStatus("Geocoding student addresses...")
      const allStudents = [...fe2Students, ...fe1Students]
      for (let i = 0; i < allStudents.length; i++) {
        const student = allStudents[i]
        if (!geoCache[student.Location]) {
          updateLoadingStatus(`Geocoding student ${i + 1}/${allStudents.length}: ${student.Name}`)
          const geo = await geocodeAddress(student.Location)
          if (geo) {
            geoCache[student.Location] = geo
          } else {
            console.warn(`Failed to geocode student location: ${student.Location}`)
          }
          await sleep(20) // Respect rate limits
        }
      }
    }

    console.log("Parsed data:", {
      fe1Count: fe1Students.length,
      fe2Count: fe2Students.length,
      agencyCount: agencies.length,
    })

    allAgencies = [...agencies]

    // Wait for map to load
    await new Promise((resolve) => {
      if (map.loaded()) {
        resolve()
      } else {
        map.on("load", resolve)
      }
    })

    // Add source for lines
    map.addSource("lines", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    // Add line layer
    map.addLayer({
      id: "assignment-lines",
      type: "line",
      source: "lines",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ffffff", // White for better visibility on dark background
        "line-width": 1.5,
        "line-opacity": 0.7,
        "line-dasharray": [2, 2],
      },
    })

    // Run matching algorithm
    updateLoadingStatus("Running matching algorithm...")
    const matchResults = matchStudents(fe2Students, fe1Students, agencies, geoCache)

    // Display results
    updateLoadingStatus("Displaying results...")
    displayResults(matchResults, fe2Students, fe1Students)

    // Show results container
    document.getElementById("loadingIndicator").style.display = "none"
    document.getElementById("resultsContainer").style.display = "block"

    // Fit map to bounds
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()

      // Extend bounds with all marker positions
      markers.forEach((marker) => {
        bounds.extend(marker.getLngLat())
      })

      map.fitBounds(bounds, { padding: 50 })
    }

    // Force one final resize
    setTimeout(handleMapResize, 500)

    notyf.success(`Matching complete! Overall score: ${matchResults.matchScore}%`)
    console.log("Matching process completed successfully")
  } catch (error) {
    console.error("Error in matching process:", error)
    notyf.error("An error occurred during the matching process. Please check the console for details.")
    document.getElementById("loadingIndicator").style.display = "none"
  }
}

// Fetch data from Firebase Firestore
async function fetchFirebaseData() {
  try {
    // Fetch FE1 students
    const fe1Query = query(collection(db, "fe1_students"))
    const fe1Snapshot = await getDocs(fe1Query)
    const fe1Students = fe1Snapshot.docs.map((doc) => doc.data())

    // Fetch FE2 students
    const fe2Query = query(collection(db, "fe2_students"))
    const fe2Snapshot = await getDocs(fe2Query)
    const fe2Students = fe2Snapshot.docs.map((doc) => doc.data())

    // Fetch agencies
    const agencyQuery = query(collection(db, "agencies"))
    const agencySnapshot = await getDocs(agencyQuery)
    const agencies = agencySnapshot.docs.map((doc) => doc.data())

    return { fe1Students, fe2Students, agencies }
  } catch (error) {
    console.error("Error fetching data from Firebase:", error)
    throw new Error("Failed to fetch data from Firebase. Please check your connection and try again.")
  }
}

// Update the loading status message
function updateLoadingStatus(message) {
  document.getElementById("loadingStatus").textContent = message
  console.log("Status:", message)
}

// Parse Excel file and return JSON data
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        resolve(json)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        reject(error)
      }
    }
    reader.onerror = (error) => {
      console.error("Error reading file:", error)
      reject(error)
    }
    reader.readAsArrayBuffer(file)
  })
}

// Geocode an address using Mapbox Geocoding API
async function geocodeAddress(address) {
  if (!address || address.trim() === "" || address.toLowerCase() === "undefined") return null

  // Check cache first
  if (geoCache[address]) return geoCache[address]

  const query = address.toLowerCase().includes("australia") ? address : `${address}, Australia`
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=au&limit=1&access_token=${mapboxToken}`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data && data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].center
      return { lon, lat }
    }
  } catch (e) {
    console.error("Geocoding error:", e)
  }
  return null
}

// Add an agency marker to the map
function addAgencyMarker(agency, geo) {
  if (!geo) return

  // Create marker element
  const el = document.createElement("div")
  el.className = "marker-agency"

  // Create popup content
  const popupContent = `
    <strong>Agency: ${agency.Name}</strong><br>
    <strong>Location:</strong> ${agency.Location}<br>
    <strong>Sector:</strong> ${agency.Sector || "N/A"}<br>
    <strong>Available spots:</strong> ${agency.Available_spots || agency["Available spots"] || 0}<br>
    <strong>Exceptions:</strong> ${agency.Exception || "None"}<br>
    <strong>First Nations:</strong> ${agency["First Nations (Aboriginal & Torres Strait Islanders)"] || "No"}<br>
    <strong>Onsite Supervisor:</strong> ${agency["Onsite SW Supervisor"] || "No"}
  `

  // Create popup
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)

  // Create and add marker
  const marker = new mapboxgl.Marker(el).setLngLat([geo.lon, geo.lat]).setPopup(popup).addTo(map)

  markers.push(marker)
}

// Add a student marker to the map
function addStudentMarker(student, isAssigned) {
  const geo = geoCache[student.Location]
  if (!geo) return

  // Create marker element
  const el = document.createElement("div")

  // Determine marker class based on student type and assignment status
  if (!isAssigned) {
    el.className = "marker-student-unassigned"
  } else if (student.FE1_Sector || student["FE 1 Sector"]) {
    el.className = "marker-student-fe2"
  } else {
    el.className = "marker-student-fe1"
  }

  const agencySector =
    student.assignment !== "Unassigned" && allAgencies.find((a) => a.Name === student.assignment)?.Sector

  // Create popup content
  const popupContent = `
    <strong>Student: ${student.Name}</strong><br>
    <strong>Location:</strong> ${student.Location}<br>
    <strong>Assigned:</strong> ${student.assignment || "Unassigned"}<br>
    <strong>Interest:</strong> ${student["Interested sectors"] || "None"}<br>
    <strong>Agency Sector:</strong> ${agencySector || "N/A"}<br>
    ${
      student.FE1_Sector || student["FE 1 Sector"]
        ? `<strong>FE1 Sector:</strong> ${student.FE1_Sector || student["FE 1 Sector"]}<br>`
        : ""
    }
    <strong>Domestic/International:</strong> ${student["Domestic / International"] || "N/A"}<br>
    <strong>Driver's License:</strong> ${student["Driver's Licence"] || "N/A"}<br>
    <strong>First Nations:</strong> ${student["First Nations (Aboriginal & Torres Strait Islanders)"] || "No"}
    ${student.matchScore ? `<br><strong>Match Score:</strong> ${student.matchScore}/100` : ""}
  `

  // Create popup
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)

  // Create and add marker
  const marker = new mapboxgl.Marker(el).setLngLat([geo.lon, geo.lat]).setPopup(popup).addTo(map)

  markers.push(marker)

  // Draw line to assigned agency if assigned
  const assignedAgency = allAgencies.find((a) => a.Name === student.assignment)
  if (assignedAgency && geoCache[assignedAgency.Location]) {
    const agencyGeo = geoCache[assignedAgency.Location]

    // Get current line features
    const lineSource = map.getSource("lines")
    const currentFeatures = lineSource._data.features || []

    // Add new line feature
    const newFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [geo.lon, geo.lat],
          [agencyGeo.lon, agencyGeo.lat],
        ],
      },
    }

    // Update source data
    lineSource.setData({
      type: "FeatureCollection",
      features: [...currentFeatures, newFeature],
    })

    // Track the line for potential removal later
    lines.push(newFeature)
  }
}

// Parse sectors from a string
function parseSectors(sectorStr) {
  if (!sectorStr) return []
  return sectorStr
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// Check if a student meets agency constraints
function meetsAgencyConstraints(agency, student) {
  // Check international student constraint
  if (agency.Exception && agency.Exception.includes("International Students")) {
    if (
      student["Domestic / International"] &&
      student["Domestic / International"].toLowerCase().includes("international")
    ) {
      return false
    }
  }

  // Check driver's license constraint
  if (agency.Exception && agency.Exception.includes("N/A Driver's Licence")) {
    if (student["Driver's Licence"] && student["Driver's Licence"].toLowerCase() === "none") {
      return false
    }
  }

  // Check First Nations constraint
  if (
    agency["First Nations (Aboriginal & Torres Strait Islanders)"] &&
    agency["First Nations (Aboriginal & Torres Strait Islanders)"].toLowerCase() === "first nations"
  ) {
    if (
      !(
        student["First Nations (Aboriginal & Torres Strait Islanders)"] &&
        student["First Nations (Aboriginal & Torres Strait Islanders)"].toLowerCase() === "first nations"
      )
    ) {
      return false
    }
  }

  // For FE2 students, check if they had the same sector in FE1
  if (
    (student.FE1_Sector || student["FE 1 Sector"]) &&
    agency.Sector &&
    (student.FE1_Sector === agency.Sector || student["FE 1 Sector"] === agency.Sector)
  ) {
    return false
  }

  // For students without FE1 onsite supervisor, they need agencies with onsite supervisors
  if (student.FE1_Onsite_Supervisor === "" || student["FE1 Onsite Supervisor"] === "") {
    if (agency["Onsite SW Supervisor"] === "" || !agency["Onsite SW Supervisor"]) {
      return false
    }
  }

  return true
}

// Check if an agency violates student sector exceptions
function violatesStudentSectorException(student, agency) {
  const knownExceptions = ["international student", "driver's licence required"]

  if (student["Sector Exception"] && student["Sector Exception"].trim().length > 0) {
    const exceptions = student["Sector Exception"].split(";").map((ex) => ex.trim().toLowerCase())

    for (const ex of exceptions) {
      if (!knownExceptions.includes(ex) && agency.Sector && agency.Sector.toLowerCase() === ex) {
        return true
      }
    }
  }

  return false
}

// Calculate Haversine distance between two points
function getHaversineDistance(lon1, lat1, lon2, lat2) {
  const R = 6371.0 // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate location score based on distance
function calculateLocationScore(distance) {
  // Score from 0-50 based on distance
  // 0km = 50 points, 50km or more = 0 points
  if (distance <= 0) return 50
  if (distance >= 50) return 0

  // Linear scale: 50 - (distance * (50/50))
  return Math.round(50 - distance * 1)
}

// Calculate sector match score
function calculateSectorScore(student, agency) {
  const interestedSectors = parseSectors(student["Interested sectors"])

  // If student has no interested sectors or agency has no sector, return 0
  if (interestedSectors.length === 0 || !agency.Sector) return 0

  // Check if agency sector matches any of student's interested sectors
  const agencySectors = agency.Sector.split(";").map((s) => s.trim().toLowerCase())

  // Count how many sectors match
  let matchCount = 0
  for (const sector of interestedSectors) {
    if (agencySectors.some((as) => as.toLowerCase() === sector.toLowerCase())) {
      matchCount++
    }
  }

  // Calculate score based on matches
  // If all interested sectors match: 50 points
  // If some match: proportional points
  // If none match: 0 points
  if (matchCount === 0) return 0

  // Bonus for multiple sector matches
  const baseScore = 40 // Base score for a single match
  const bonusPerMatch = 10 // Bonus for each additional match

  return Math.min(50, baseScore + (matchCount - 1) * bonusPerMatch)
}

// Calculate overall match score for a student-agency pair
function calculateMatchScore(student, agency, geoCache) {
  // Calculate location score (0-50)
  let locationScore = 0
  const studentGeo = geoCache[student.Location]
  const agencyGeo = geoCache[agency.Location]

  if (studentGeo && agencyGeo) {
    const distance = getHaversineDistance(studentGeo.lon, studentGeo.lat, agencyGeo.lon, agencyGeo.lat)
    locationScore = calculateLocationScore(distance)
  }

  // Calculate sector score (0-50)
  const sectorScore = calculateSectorScore(student, agency)

  // Apply weights from sliders, but ensure both factors are considered
  // Minimum weight of 20% for each factor, regardless of slider position
  const adjustedLocationWeight = Math.max(20, Math.min(80, locationWeight))
  const adjustedSectorWeight = 100 - adjustedLocationWeight

  // Calculate weighted scores
  const weightedLocationScore = Math.round((locationScore / 50) * adjustedLocationWeight)
  const weightedSectorScore = Math.round((sectorScore / 50) * adjustedSectorWeight)

  // Total score (0-100)
  const totalScore = weightedLocationScore + weightedSectorScore

  return {
    total: totalScore,
    locationScore: locationScore,
    sectorScore: sectorScore,
    weightedLocationScore: weightedLocationScore,
    weightedSectorScore: weightedSectorScore,
    adjustedLocationWeight: adjustedLocationWeight,
    adjustedSectorWeight: adjustedSectorWeight,
    distance:
      studentGeo && agencyGeo
        ? getHaversineDistance(studentGeo.lon, studentGeo.lat, agencyGeo.lon, agencyGeo.lat)
        : null,
  }
}



// Replace the matchStudents function with this more modular version
function matchStudents(fe2Students, fe1Students, agencies, geoCache) {
  const allStudents = [...fe2Students, ...fe1Students];
  const allAvailableAgencies = [];

  // Flatten agencies to account for available spots
  for (const agency of agencies) {
    const spots = agency["Available spots"] || agency.Available_spots || 0;
    for (let i = 0; i < spots; i++) {
      allAvailableAgencies.push({ ...agency, originalName: agency.Name, instanceId: i });
    }
  }

  const costMatrix = [];
  const validPairs = new Map(); // Map row index to list of valid agency indices

  for (let i = 0; i < allStudents.length; i++) {
    const row = [];
    validPairs.set(i, []);
    for (let j = 0; j < allAvailableAgencies.length; j++) {
      const student = allStudents[i];
      const agency = allAvailableAgencies[j];

      // Skip if student doesn't meet constraints
      if (
        !geoCache[student.Location] ||
        !geoCache[agency.Location] ||
        !meetsAgencyConstraints(agency, student) ||
        violatesStudentSectorException(student, agency)
      ) {
        row.push(1e6); // Big number to simulate "infinite" cost
        continue;
      }
      // Enforce FE2 no-supervisor constraint
      const isFE2 = student.FE1_Sector || student["FE 1 Sector"];
      const hadNoSupervisor =
        !student["FE1 Onsite Supervisor"] ||
        student["FE1 Onsite Supervisor"].toLowerCase() === "no" ||
        student["FE1 Onsite Supervisor"] === "";

      const agencyHasSupervisor =
        agency["Onsite SW Supervisor"] && agency["Onsite SW Supervisor"].toLowerCase() === "yes";

      if (isFE2 && hadNoSupervisor && !agencyHasSupervisor) {
        row.push(1e6); // Block this match
        continue;
      }

      const scoreDetails = calculateMatchScore(student, agency, geoCache);
      row.push(100 - scoreDetails.total); // Lower cost = better match
      validPairs.get(i).push(j);
    }
    costMatrix.push(row);
  }

  // Run Hungarian algorithm
  const munkres = new Munkres();
  const assignments = munkres.compute(costMatrix);

  // Track results
  matchedStudents = [];
  unassignedStudents = [];
  let totalScore = 0;
  const studentScores = [];

  const assignedAgencyIndices = new Set();

  for (const [studentIndex, agencyIndex] of assignments) {
    const student = allStudents[studentIndex];
    const agency = allAvailableAgencies[agencyIndex];

    // Was this a real valid assignment?
    const score = 100 - costMatrix[studentIndex][agencyIndex];

    if (costMatrix[studentIndex][agencyIndex] >= 1e6) {
      const isFE2 = student.FE1_Sector || student["FE 1 Sector"];
      const hadNoSupervisor =
        !student["FE1 Onsite Supervisor"] ||
        student["FE1 Onsite Supervisor"].toLowerCase() === "no" ||
        student["FE1 Onsite Supervisor"] === "";
    
      // More specific unassigned reason for critical FE2 students
      if (isFE2 && hadNoSupervisor) {
        student.unassignedReason = "No agency with required onsite supervisor";
      } else {
        student.unassignedReason = "No suitable agency match";
      }
    
      student.assignment = "Unassigned";
      unassignedStudents.push(student);
      continue;
    }
    

    // Mark as assigned
    student.assignment = agency.originalName;
    student.assignedSector = agency.Sector;
    student.matchScore = score;
    student.distance = getHaversineDistance(
      geoCache[student.Location].lon,
      geoCache[student.Location].lat,
      geoCache[agency.Location].lon,
      geoCache[agency.Location].lat
    );
    student.scoreDetails = calculateMatchScore(student, agency, geoCache);
    const reasonParts = [];

    if (student.scoreDetails?.sectorScore > 0) {
      reasonParts.push("sector aligned");
    }
    if (student.scoreDetails?.locationScore > 0) {
      reasonParts.push("close to location");
    }

    const isFE2 = student.FE1_Sector || student["FE 1 Sector"];
    const hadNoSupervisor =
      !student["FE1 Onsite Supervisor"] ||
      student["FE1 Onsite Supervisor"].toLowerCase() === "no" ||
      student["FE1 Onsite Supervisor"] === "";

    const agencyHasSupervisor =
      agency["Onsite SW Supervisor"] && agency["Onsite SW Supervisor"].toLowerCase() === "yes";

    if (isFE2 && hadNoSupervisor && agencyHasSupervisor) {
      reasonParts.push("required onsite supervisor present");
    }

    student.matchReason = `Matched due to ${reasonParts.join(", ")}`;


    matchedStudents.push(student);
    totalScore += student.matchScore;
    assignedAgencyIndices.add(agencyIndex);

    studentScores.push({
      name: student.Name,
      assignment: student.assignment,
      score: student.matchScore,
      scoreDetails: student.scoreDetails,
      type: student.FE1_Sector || student["FE 1 Sector"] ? "FE2" : "FE1",
    });
  }

  // Assign all students not in the assignments list as unassigned
  const assignedStudentIndices = new Set(assignments.map(([i, _]) => i));
  for (let i = 0; i < allStudents.length; i++) {
    if (!assignedStudentIndices.has(i)) {
      const student = allStudents[i];
      student.assignment = "Unassigned";
      student.unassignedReason = "No assignment made by optimizer";
      unassignedStudents.push(student);
    }
  }

  // Match score: average of all assigned students' scores
  const maxPossibleScore = allStudents.length * 100;
  const matchScore = totalScore > 0 ? ((totalScore / maxPossibleScore) * 100).toFixed(2) : "0.00";

  return {
    matchScore,
    studentScores,
    totalScore,
    maxPossibleScore,
  };
}



// Update the displayResults function to remove priority bonus display
function displayResults(matchResults, fe2Students, fe1Students) {
  // Update match score
  document.getElementById("matchScore").textContent = `Overall Match Score: ${matchResults.matchScore}%`

 // Metrics
const totalStudents = fe1Students.length + fe2Students.length;
const matchedCount = matchedStudents.length;
const unassignedCount = unassignedStudents.length;

const averageDistance = (
  matchedStudents.reduce((sum, s) => sum + (s.distance || 0), 0) / matchedCount
).toFixed(1);

const averageLocationScore = (
  matchedStudents.reduce((sum, s) => sum + (s.scoreDetails?.locationScore || 0), 0) / matchedCount
).toFixed(1);

const averageSectorScore = (
  matchedStudents.reduce((sum, s) => sum + (s.scoreDetails?.sectorScore || 0), 0) / matchedCount
).toFixed(1);

const unmatchedFE2WithSupervisorNeed = unassignedStudents.filter((s) => {
  const isFE2 = s.FE1_Sector || s["FE 1 Sector"];
  const hadNoSupervisor =
    !s["FE1 Onsite Supervisor"] ||
    s["FE1 Onsite Supervisor"].toLowerCase() === "no" ||
    s["FE1 Onsite Supervisor"] === "";
  return isFE2 && hadNoSupervisor;
}).length;

// Sort for top 5 lowest match scores
const lowestMatchStudents = [...matchedStudents]
  .sort((a, b) => (a.matchScore || 0) - (b.matchScore || 0))
  .slice(0, 5);

// Top 5 students with 0 sector score
const studentsWithZeroSector = matchedStudents
  .filter((s) => (s.scoreDetails?.sectorScore || 0) === 0)
  .slice(0, 5);

const assignedFarAway = matchedStudents.filter(
  (s) => (s.distance || 0) > 30
);

const agencyUseCount = {};
matchedStudents.forEach((s) => {
  agencyUseCount[s.assignment] = (agencyUseCount[s.assignment] || 0) + 1;
});

const fullyUsedAgencies = Object.entries(agencyUseCount).filter(([name, count]) => {
  const agency = allAgencies.find((a) => a.Name === name);
  const spots = agency?.["Available spots"] || agency?.Available_spots || 0;
  return count >= spots;
}).map(([name]) => name);

// Dropdown HTML helpers
const renderStudentList = (students) => {
  if (!students.length) return "<em>None</em>";
  return "<ul class='mb-1'>" + students.map((s) =>
    `<li>${s.Name} (${s.matchScore || 0}/100)</li>`
  ).join("") + "</ul>";
};

const summaryHTML = `
  <div class="alert alert-info mb-4">
    <strong>Summary:</strong><br>
    🔹 <strong>Matched:</strong> ${matchedCount} / ${totalStudents}<br>
    🔹 <strong>Unassigned:</strong> ${unassignedCount}<br>
    🔹 <strong>Overall Match Score:</strong> ${matchResults.matchScore}%<br>
    🔹 <strong>Average Distance:</strong> ${averageDistance} km<br>
    🔹 <strong>Average Location Score:</strong> ${averageLocationScore} / 50<br>
    🔹 <strong>Average Sector Score:</strong> ${averageSectorScore} / 50<br>
    🔹 <strong>Unmatched FE2s needing supervisor:</strong> ${unmatchedFE2WithSupervisorNeed}<br>
    <hr>
    <strong>Insights:</strong><br>

    <details>
      <summary>🔻 <strong>Lowest Assigned Match Scores</strong></summary>
      ${renderStudentList(lowestMatchStudents)}
    </details>

    <details class="mt-2">
      <summary>⚠️ <strong>Students with 0 Sector Score</strong></summary>
      ${renderStudentList(studentsWithZeroSector)}
    </details>

    📍 <strong>Students >30km from placement:</strong> ${assignedFarAway.length}<br>
    🧯 <strong>Fully Used Agencies:</strong> ${fullyUsedAgencies.length > 0 ? fullyUsedAgencies.join(", ") : "None"}
  </div>
`;

// Insert at top of results
document.getElementById("resultsSummary").innerHTML = summaryHTML;




  // Display FE2 results
  const fe2Results = document.getElementById("fe2Results")
  fe2Results.innerHTML = `
  <div class="mt-2 small text-muted">
  <span class="badge bg-primary me-1">&nbsp;</span> Location Score
  <span class="badge bg-success ms-3 me-1">&nbsp;</span> Sector Score
</div>`;


  for (const student of fe2Students) {
    const scoreDetails = student.scoreDetails || {
      total: 0,
      locationScore: 0,
      sectorScore: 0,
      weightedLocationScore: 0,
      weightedSectorScore: 0,
      adjustedLocationWeight: locationWeight,
      adjustedSectorWeight: sectorWeight,
    }

    const isAssigned = student.assignment && student.assignment !== "Unassigned"

    const studentDiv = document.createElement("div")
    studentDiv.className = "student-item"

    let scoreHtml = ""
    if (isAssigned) {
      scoreHtml = `
    <div class="score-breakdown">
      <div class="score-component">
        <span class="score-label">Total Score:</span>
        <div class="score-bar">
          <div class="progress progress-sm">
            <div class="progress-bar bg-primary" 
                 style="width: ${scoreDetails.weightedLocationScore}%"></div>
            <div class="progress-bar bg-success" 
                 style="width: ${scoreDetails.weightedSectorScore}%"></div>
          </div>
        </div>
        <span class="score-value">${scoreDetails.total}/100</span>
      </div>
      <div class="small text-muted mt-1">
        <span class="badge bg-primary me-1"></span> Location (${scoreDetails.adjustedLocationWeight || locationWeight}%): ${scoreDetails.weightedLocationScore}
        <span class="badge bg-success ms-2 me-1"></span> Sector (${scoreDetails.adjustedSectorWeight || sectorWeight}%): ${scoreDetails.weightedSectorScore}
        <br>Distance: ${student.distance?.toFixed(1) || "?"} km
        ${student.matchReason ? `<br>Reason: ${student.matchReason}` : ""}
      </div>
    </div>
  `
    } else {
      scoreHtml = `
        <div class="small text-danger mt-1">
          ${student.unassignedReason || "No suitable match found"}
        </div>
      `
    }

    studentDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${student.Name}</strong> 
          ${
            isAssigned
              ? `→ <span class="text-success">${student.assignment}</span>`
              : `<span class="text-danger">(Unassigned)</span>`
          }
        </div>
        <span class="badge bg-${getScoreColor(student.matchScore || 0)}">
          Score: ${student.matchScore || 0}/100
        </span>
      </div>
      <div class="small text-muted">
        Location: ${student.Location} | 
        Interests: ${student["Interested sectors"] || "None"}
      </div>
      ${scoreHtml}
    `

    fe2Results.appendChild(studentDiv)

    // Add student marker to map
    if (isAssigned) {
      addStudentMarker(student, true)
    }
  }

  // Display FE1 results
  const fe1Results = document.getElementById("fe1Results")
  fe1Results.innerHTML = `
  <div class="mt-2 small text-muted">
  <span class="badge bg-primary me-1">&nbsp;</span> Location Score
  <span class="badge bg-success ms-3 me-1">&nbsp;</span> Sector Score
</div>`;

  for (const student of fe1Students) {
    const scoreDetails = student.scoreDetails || {
      total: 0,
      locationScore: 0,
      sectorScore: 0,
      weightedLocationScore: 0,
      weightedSectorScore: 0,
      adjustedLocationWeight: locationWeight,
      adjustedSectorWeight: sectorWeight,
    }

    const isAssigned = student.assignment && student.assignment !== "Unassigned"

    const studentDiv = document.createElement("div")
    studentDiv.className = "student-item"

    let scoreHtml = ""
    if (isAssigned) {
      scoreHtml = `
    <div class="score-breakdown">
      <div class="score-component">
        <span class="score-label">Total Score:</span>
        <div class="score-bar">
          <div class="progress progress-sm">
            <div class="progress-bar bg-primary" 
                 style="width: ${scoreDetails.weightedLocationScore}%"></div>
            <div class="progress-bar bg-success" 
                 style="width: ${scoreDetails.weightedSectorScore}%"></div>
          </div>
        </div>
        <span class="score-value">${scoreDetails.total}/100</span>
      </div>
      <div class="small text-muted mt-1">
        <span class="badge bg-primary me-1"></span> Location (${scoreDetails.adjustedLocationWeight || locationWeight}%): ${scoreDetails.weightedLocationScore}
        <span class="badge bg-success ms-2 me-1"></span> Sector (${scoreDetails.adjustedSectorWeight || sectorWeight}%): ${scoreDetails.weightedSectorScore}
        <br>Distance: ${student.distance?.toFixed(1) || "?"} km
        ${student.matchReason ? `<br>Reason: ${student.matchReason}` : ""}
      </div>
    </div>
  `
    } else {
      scoreHtml = `
        <div class="small text-danger mt-1">
          ${student.unassignedReason || "No suitable match found"}
        </div>
      `
    }

    studentDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${student.Name}</strong> 
          ${
            isAssigned
              ? `→ <span class="text-success">${student.assignment}</span>`
              : `<span class="text-danger">(Unassigned)</span>`
          }
        </div>
        <span class="badge bg-${getScoreColor(student.matchScore || 0)}">
          Score: ${student.matchScore || 0}/100
        </span>
        
      </div>
      <div class="small text-muted">
        Location: ${student.Location} | 
        Interests: ${student["Interested sectors"] || "None"}
      </div>
      ${scoreHtml}
    `

    fe1Results.appendChild(studentDiv)

    // Add student marker to map
    if (isAssigned) {
      addStudentMarker(student, true)
    }
  }

  // Display unassigned students
  const unassignedResults = document.getElementById("unassignedResults")
  unassignedResults.innerHTML = ""

  if (unassignedStudents.length === 0) {
    document.getElementById("unassignedCount").textContent = "No unassigned students"
  } else {
    document.getElementById("unassignedCount").textContent = `${unassignedStudents.length} unassigned students`

    for (const student of unassignedStudents) {
      const studentDiv = document.createElement("div")
      studentDiv.className = "student-item"
      studentDiv.innerHTML = `
        <div>
          <strong>${student.Name}</strong> 
          <span class="badge bg-secondary">${student.FE1_Sector || student["FE 1 Sector"] ? "FE2" : "FE1"}</span>
        </div>
        <div class="small text-muted">
          Location: ${student.Location} | 
          Interests: ${student["Interested sectors"] || "None"} | 
          ${
            student.FE1_Sector || student["FE 1 Sector"]
              ? `FE1 Sector: ${student.FE1_Sector || student["FE 1 Sector"]} | `
              : ""
          }
          Domestic/International: ${student["Domestic / International"] || "N/A"} | 
          Driver's License: ${student["Driver's Licence"] || "N/A"}
        </div>
        <div class="small text-danger">
          Reason: ${student.unassignedReason || "No suitable match found"}
        </div>
      `

      unassignedResults.appendChild(studentDiv)

      // Add unassigned student marker to map
      addStudentMarker(student, false)
    }
  }
 

}

// Export results to Excel
function exportToExcel(matchedStudents, unassignedStudents, locationWeight, sectorWeight) {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()

  // Create data for FE2 students
  const fe2Data = matchedStudents
    .filter((s) => s.FE1_Sector || s["FE 1 Sector"])
    .map((s) => ({
      "Student Name": s.Name,
      "Student Location": s.Location,
      "Assigned Agency": s.assignment,
      "Agency Sector": s.assignedSector || "",
      "Distance (km)": s.distance ? s.distance.toFixed(1) : "",
      "Match Score": s.matchScore || 0,
      "Location Score": s.scoreDetails?.locationScore || 0,
      "Sector Score": s.scoreDetails?.sectorScore || 0,
      Priority: s.priority || 0,
      "Priority Reason": s.priorityReason || "",
      "Match Reason": s.matchReason || "",
      "FE1 Sector": s.FE1_Sector || s["FE 1 Sector"] || "",
      "Domestic/International": s["Domestic / International"] || "",
      "Driver's License": s["Driver's Licence"] || "",
      "First Nations": s["First Nations (Aboriginal & Torres Strait Islanders)"] || "",
      "Interested Sectors": s["Interested sectors"] || "",
    }))

  // Create data for FE1 students
  const fe1Data = matchedStudents
    .filter((s) => !(s.FE1_Sector || s["FE 1 Sector"]))
    .map((s) => ({
      "Student Name": s.Name,
      "Student Location": s.Location,
      "Assigned Agency": s.assignment,
      "Agency Sector": s.assignedSector || "",
      "Distance (km)": s.distance ? s.distance.toFixed(1) : "",
      "Match Score": s.matchScore || 0,
      "Location Score": s.scoreDetails?.locationScore || 0,
      "Sector Score": s.scoreDetails?.sectorScore || 0,
      Priority: s.priority || 0,
      "Priority Reason": s.priorityReason || "",
      "Match Reason": s.matchReason || "",
      "Domestic/International": s["Domestic / International"] || "",
      "Driver's License": s["Driver's Licence"] || "",
      "First Nations": s["First Nations (Aboriginal & Torres Strait Islanders)"] || "",
      "Interested Sectors": s["Interested sectors"] || "",
    }))

  // Create data for unassigned students
  const unassignedData = unassignedStudents.map((s) => ({
    "Student Name": s.Name,
    "Student Type": s.FE1_Sector || s["FE 1 Sector"] ? "FE2" : "FE1",
    "Student Location": s.Location,
    Priority: s.priority || 0,
    "Priority Reason": s.priorityReason || "",
    "Unassigned Reason": s.unassignedReason || "No suitable match found",
    "FE1 Sector": s.FE1_Sector || s["FE 1 Sector"] || "",
    "Domestic/International": s["Domestic / International"] || "",
    "Driver's License": s["Driver's Licence"] || "",
    "First Nations": s["First Nations (Aboriginal & Torres Strait Islanders)"] || "",
    "Interested Sectors": s["Interested sectors"] || "",
    "Sector Exception": s["Sector Exception"] || "",
  }))

  // Create summary data
  const summaryData = [
    {
      "Total Students": matchedStudents.length + unassignedStudents.length,
      "Matched Students": matchedStudents.length,
      "Unassigned Students": unassignedStudents.length,
      "FE2 Students": fe2Data.length,
      "FE1 Students": fe1Data.length,
      "FE2 Students Needing Supervisors":
        matchedStudents.filter((s) => s.priority === 3).length +
        unassignedStudents.filter((s) => s.priority === 3).length,
      "Overall Match Score": `${(
        (matchedStudents.reduce((sum, s) => sum + (s.matchScore || 0), 0) / (matchedStudents.length * 100)) * 100
      ).toFixed(2)}%`,
      "Location Weight": `${locationWeight}%`,
      "Sector Weight": `${sectorWeight}%`,
    },
  ]

  // Add worksheets to workbook
  const ws0 = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws0, "Summary")

  const ws1 = XLSX.utils.json_to_sheet(fe2Data)
  XLSX.utils.book_append_sheet(wb, ws1, "FE2 Students")

  const ws2 = XLSX.utils.json_to_sheet(fe1Data)
  XLSX.utils.book_append_sheet(wb, ws2, "FE1 Students")

  const ws3 = XLSX.utils.json_to_sheet(unassignedData)
  XLSX.utils.book_append_sheet(wb, ws3, "Unassigned Students")

  // Generate Excel file
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "student_placements.xlsx")

  notyf.success("Results exported to Excel successfully!")
}

// Utility function to pause execution
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper function to determine score color
function getScoreColor(score) {
  if (score >= 80) return "success"
  if (score >= 60) return "info"
  if (score >= 40) return "warning"
  return "danger"
}

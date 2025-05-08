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
let sessionalStaffList = []
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

// Add event listener for map search button
document.getElementById("mapSearchBtn").addEventListener("click", () => {
  const query = document.getElementById("mapSearchInput").value.trim().toLowerCase();
  if (!query) return;

  const sources = [
    { data: matchedStudents, label: "Student" },
    { data: unassignedStudents, label: "Student" },
    { data: allAgencies, label: "Agency" },
    { data: sessionalStaffList, label: "Sessional Staff" }
  ];

  for (const group of sources) {
    const match = group.data.find(item => item.Name && item.Name.toLowerCase().includes(query));
    if (match && geoCache[match.Location]) {
      const { lon, lat } = geoCache[match.Location];
      map.flyTo({ center: [lon, lat], zoom: 13 });

      new mapboxgl.Popup()
        .setLngLat([lon, lat])
        .setHTML(`<strong>${match.Name}</strong><br>Type: ${group.label}`)
        .addTo(map);
      return;
    }
  }

  notyf.error("No match found for: " + query);
});

// Add event listener for Enter key in search input
document.getElementById("mapSearchInput").addEventListener("keyup", function (e) {
  if (e.key === "Enter") document.getElementById("mapSearchBtn").click();
});



// Fix the populateGeoCacheFromFirebase function to properly handle agency data
function populateGeoCacheFromFirebase(fe1Students, fe2Students, agencies, sessionalStaff) {
  console.log("Populating geoCache from Firebase data...");

  // Agencies
  agencies.forEach((agency) => {
    if (agency.latitude && agency.longitude) {
      geoCache[agency.Location] = { lat: agency.latitude, lon: agency.longitude };
    }
  });

  // Students
  [...fe1Students, ...fe2Students].forEach((student) => {
    if (student.latitude && student.longitude) {
      geoCache[student.Location] = { lat: student.latitude, lon: student.longitude };
    }
  });

  // 🔧 Add this: Sessional staff
  sessionalStaff.forEach((staff) => {
    if (staff.latitude && staff.longitude) {
      geoCache[staff.Location] = { lat: staff.latitude, lon: staff.longitude };
      console.log(`Added staff to geoCache: ${staff.Name} at ${staff.latitude}, ${staff.longitude}`);
    } else {
      console.warn(`Missing coordinates for staff: ${staff.Name}`);
    }
  });

  console.log(`Populated geoCache with ${Object.keys(geoCache).length} locations`);
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
      sessionalStaffList = data.sessionalStaffList

      // Normalize sessional staff by splitting multi-role entries
      sessionalStaffList = sessionalStaffList.flatMap(staff => {
        const roles = []
        if (staff.LO > 0) roles.push({ ...staff, Role: "LO" })
        if (staff.EFE > 0) roles.push({ ...staff, Role: "EFE" })
        return roles
      })


      console.log("Firebase data loaded:", {
        fe1Count: fe1Students.length,
        fe2Count: fe2Students.length,
        agencyCount: agencies.length,
      })

      // Populate geoCache with coordinates from Firebase
      updateLoadingStatus("Loading geocoded data from Firebase...")
      populateGeoCacheFromFirebase(fe1Students, fe2Students, agencies, sessionalStaffList);


      // Add agency markers for Firebase data
      updateLoadingStatus("Adding agency markers...")
      agencies.forEach((agency) => {
        if (geoCache[agency.Location]) {
        
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
      ;[fe1Students, fe2Students, agencies, sessionalStaffList] = await Promise.all([
        parseExcelFile(fe1File),
        parseExcelFile(fe2File),
        parseExcelFile(agencyFile),
        parseExcelFile(sessionalStaffFile),
      ])

      // Normalize sessional staff by splitting multi-role entries
      sessionalStaffList = sessionalStaffList.flatMap(staff => {
        const roles = []
        if (staff.LO > 0) roles.push({ ...staff, Role: "LO" })
        if (staff.EFE > 0) roles.push({ ...staff, Role: "EFE" })
        return roles
      })


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

        updateLoadingStatus("Geocoding sessional staff addresses...")
        for (let i = 0; i < sessionalStaffList.length; i++) {
          const staff = sessionalStaffList[i]
          if (!geoCache[staff.Location]) {
            updateLoadingStatus(`Geocoding staff ${i + 1}/${sessionalStaffList.length}: ${staff.Name}`)
            const geo = await geocodeAddress(staff.Location)
            if (geo) {
              geoCache[staff.Location] = geo
            } else {
              console.warn(`Failed to geocode staff location: ${staff.Location}`)
            }
            await sleep(100) // prevent rate limits
          }
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
    assignSessionalStaff([...fe2Students, ...fe1Students], sessionalStaffList, geoCache, agencies)

    // Display results
    updateLoadingStatus("Displaying results...")
    displayResults(matchResults, fe2Students, fe1Students)

    const studentFeatures = [...fe1Students, ...fe2Students].map((student) => {
      const geo = geoCache[student.Location]
      if (!geo) return null
      return {
        type: "Feature",
        properties: {
          name: student.Name,
          assignment: student.assignment,
          sector: student["Interested sectors"] || "",
          type: student.FE1_Sector || student["FE 1 Sector"] ? "FE2" : "FE1"
        },
        geometry: {
          type: "Point",
          coordinates: [geo.lon, geo.lat]
        }
      }
    }).filter(Boolean)

    const agencyFeatures = allAgencies.map((agency) => {
      const geo = geoCache[agency.Location]
      if (!geo) return null
      return {
        type: "Feature",
        properties: {
          name: agency.Name,
          sector: agency.Sector || "",
          type: "agency"
        },
        geometry: {
          type: "Point",
          coordinates: [geo.lon, geo.lat]
        }
      }
    }).filter(Boolean)

    const uniqueStaffMap = new Map()
    sessionalStaffList.forEach(staff => {
      if (!uniqueStaffMap.has(staff.Name)) {
        uniqueStaffMap.set(staff.Name, staff)
      }
    })

    const sessionalStaffFeatures = Array.from(uniqueStaffMap.values()).map((staff) => {
      const geo = geoCache[staff.Location]
      if (!geo) return null
      return {
        type: "Feature",
        properties: {
          name: staff.Name,
          role: `${staff.LO > 0 ? "LO" : ""}${staff.EFE > 0 ? (staff.LO > 0 ? " & EFE" : "EFE") : ""}`,
          sector: staff.Sector || "",
          type: "sessional"
        },
        geometry: {
          type: "Point",
          coordinates: [geo.lon, geo.lat]
        }
      }
    }).filter(Boolean)

    
    
    map.addSource("agencies", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: agencyFeatures
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    })
    

    const assignmentLineFeatures = matchedStudents.map(student => {
      const studentGeo = geoCache[student.Location]
      const agency = allAgencies.find(a => a.Name === student.assignment)
      const agencyGeo = geoCache[agency?.Location]
    
      if (!studentGeo || !agencyGeo) return null
    
      return {
        type: "Feature",
        properties: {
          student: student.Name,
          agency: agency.Name
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [studentGeo.lon, studentGeo.lat],
            [agencyGeo.lon, agencyGeo.lat]
          ]
        }
      }
    }).filter(Boolean)

    const staffLineFeatures = matchedStudents.flatMap((student) => {
      const features = []
      const studentGeo = geoCache[student.Location]
    
      if (!studentGeo) return features
    
      // LO Line
      if (student.assignedLO) {
        const lo = sessionalStaffList.find(s => s.Name === student.assignedLO);
        const loGeo = geoCache[lo?.Location];
        if (loGeo) {
          features.push({
            type: "Feature",
            properties: {
              student: student.Name,
              staff: lo.Name,
              type: "LO"
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [studentGeo.lon, studentGeo.lat],
                [loGeo.lon, loGeo.lat]
              ]
            }
          });
        }
      }
    
      // EFE Line
      if (student.assignedEFE) {
        const efe = sessionalStaffList.find(s => s.Name === student.assignedEFE);
        const efeGeo = geoCache[efe?.Location];
        if (efeGeo) {
          features.push({
            type: "Feature",
            properties: {
              student: student.Name,
              staff: efe.Name,
              type: "EFE"
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [studentGeo.lon, studentGeo.lat],
                [efeGeo.lon, efeGeo.lat]
              ]
            }
          });
        }
      }
    
      return features
    })
    
    
    map.addSource("assignment-lines", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: assignmentLineFeatures
      }
    })
    

    map.addSource("students", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: studentFeatures
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    })

    map.addSource("sessionalStaff", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: sessionalStaffFeatures
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    })
    map.addSource("staff-lines", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: staffLineFeatures
      }
    })
    
  
    

    // Cluster layer
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "students",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#3B82F6",
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 50, 25]
      }
    })

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "students",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12
      }
    })

    // Separate styles for FE1 and FE2 students
    map.addLayer({
      id: "unclustered-fe1",
      type: "circle",
      source: "students",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "type"], "FE1"]],
      paint: {
        "circle-color": "#2196F3",
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
      }
    })

    map.addLayer({
      id: "unclustered-fe2",
      type: "circle",
      source: "students",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "type"], "FE2"]],
      paint: {
        "circle-color": "#4CAF50",
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
      }
    })

    map.addLayer({
      id: "agency-clusters",
      type: "circle",
      source: "agencies",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#FF9800",
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 50, 25],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff"
      }
    })

    map.addLayer({
      id: "agency-cluster-count",
      type: "symbol",
      source: "agencies",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12
      }
    })    

    map.addLayer({
      id: "staff-clusters",
      type: "circle",
      source: "sessionalStaff",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#9C27B0", // purple
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 50, 25],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff"
      }
    })
    
    map.addLayer({
      id: "staff-cluster-count",
      type: "symbol",
      source: "sessionalStaff",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12
      }
    })
    
    map.addLayer({
      id: "unclustered-staff",
      type: "circle",
      source: "sessionalStaff",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#9C27B0",
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
      }
    })
    
    //line for staff
    map.addLayer({
      id: "staff-lines-layer",
      type: "line",
      source: "staff-lines",
      paint: {
        "line-color": [
          "match",
          ["get", "type"],
          "LO", "#3B82F6", // Blue
          "EFE", "#10B981", // Green
          "#ccc"
        ],
        "line-width": 1.5,
        "line-opacity": 0.7,
        "line-dasharray": [1, 2]
      }
    })
    

    // Add this handler to allow zooming into agency clusters on click
    map.on("click", "agency-clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["agency-clusters"] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource("agencies").getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom });
      });
    });

    // Optionally, change cursor to pointer on hover
    map.on("mouseenter", "agency-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "agency-clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    map.addLayer({
      id: "unclustered-agencies",
      type: "circle",
      source: "agencies",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#FF9800", // orange
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
      }
    })
    

    map.addLayer({
      id: "assignment-lines-layer",
      type: "line",
      source: "assignment-lines",
      paint: {
        "line-color": "#ffffff",
        "line-width": 1.5,
        "line-opacity": 0.7,
        "line-dasharray": [2, 2]
      }
    })

    map.on("click", "unclustered-agencies", (e) => {
      const props = e.features[0].properties
      const coords = e.features[0].geometry.coordinates.slice()
    
      new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`<strong>Agency: ${props.name}</strong><br>Sector: ${props.sector}`)
        .addTo(map)
    })
    

    document.getElementById("toggleLines").addEventListener("change", (e) => {
      const visibility = e.target.checked ? "visible" : "none"
      map.setLayoutProperty("assignment-lines-layer", "visibility", visibility)
    })
    
    document.getElementById("toggleStaffLines").addEventListener("change", function () {
      const visibility = this.checked ? "visible" : "none";
      map.setLayoutProperty("staff-lines-layer", "visibility", visibility); // ✅ now matches
    });
    
    

    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })
      const clusterId = features[0].properties.cluster_id
      map.getSource("students").getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        map.easeTo({ center: features[0].geometry.coordinates, zoom })
      })
    })

    map.on("click", ["unclustered-fe1", "unclustered-fe2"], (e) => {
      const props = e.features[0].properties
      const coords = e.features[0].geometry.coordinates.slice()

      new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`<strong>${props.name}</strong><br>Assigned to: ${props.assignment}<br>Type: ${props.type}`)
        .addTo(map)
    })

    map.on("click", "unclustered-staff", (e) => {
      const props = e.features[0].properties
      const coords = e.features[0].geometry.coordinates.slice()
    
      new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`<strong>${props.name}</strong><br>Role: ${props.role}<br>Sectors: ${props.sector}`)
        .addTo(map)
    })

    map.on("click", "staff-clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["staff-clusters"] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource("sessionalStaff").getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom });
      })
    });

    
    
    // Line visibility toggle
    const toggleBox = document.createElement("div")
    toggleBox.innerHTML = `
      <label style="background:#111; color:white; padding:5px; display:inline-block; margin-top:10px;">
        <input type="checkbox" id="toggleLines" checked /> Show Assignment Lines
      </label>
    `
    document.getElementById("controls")?.appendChild(toggleBox)
    
    document.getElementById("toggleLines").addEventListener("change", function () {
      const visibility = this.checked ? "visible" : "none"
      map.setLayoutProperty("assignment-lines", "visibility", visibility)
    })

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

  setupHighlighting();
}

// Highlight Lines By Entity
// Highlight Lines By Entity
function highlightLinesByEntity(name) {
  map.setLayoutProperty("assignment-lines-layer", "visibility", "visible");
  map.setLayoutProperty("staff-lines-layer", "visibility", "visible");

  map.setPaintProperty("assignment-lines-layer", "line-color", [
    "case",
    ["any", ["==", ["get", "student"], name], ["==", ["get", "agency"], name]],
    "#FFD700",
    "#ffffff"
  ]);

  map.setPaintProperty("staff-lines-layer", "line-color", [
    "case",
    ["any", ["==", ["get", "student"], name], ["==", ["get", "staff"], name]],
    "#FFD700",
    ["match", ["get", "type"], "LO", "#3B82F6", "EFE", "#10B981", "#ccc"]
  ]);

  map.setPaintProperty("assignment-lines-layer", "line-width", [
    "case",
    ["any", ["==", ["get", "student"], name], ["==", ["get", "agency"], name]],
    4,
    1.5
  ]);

  map.setPaintProperty("staff-lines-layer", "line-width", [
    "case",
    ["any", ["==", ["get", "student"], name], ["==", ["get", "staff"], name]],
    4,
    1.5
  ]);

  map.setPaintProperty("assignment-lines-layer", "line-dasharray", [1, 2]);
  map.setPaintProperty("staff-lines-layer", "line-dasharray", [1, 2]);

  // Dim all unconnected points by reducing opacity
  const connected = matchedStudents.filter(s =>
    s.Name === name || s.assignment === name || s.assignedLO === name || s.assignedEFE === name
  ).map(s => [s.Name, s.assignment, s.assignedLO, s.assignedEFE]).flat().filter(Boolean);

  map.setPaintProperty("unclustered-fe1", "circle-opacity", [
    "case",
    ["in", ["get", "name"], ["literal", connected]],
    1,
    0.2
  ]);

  map.setPaintProperty("unclustered-fe2", "circle-opacity", [
    "case",
    ["in", ["get", "name"], ["literal", connected]],
    1,
    0.2
  ]);

  map.setPaintProperty("unclustered-agencies", "circle-opacity", [
    "case",
    ["in", ["get", "name"], ["literal", connected]],
    1,
    0.2
  ]);

  map.setPaintProperty("unclustered-staff", "circle-opacity", [
    "case",
    ["in", ["get", "name"], ["literal", connected]],
    1,
    0.2
  ]);

}

function clearLineHighlights() {
  map.setPaintProperty("assignment-lines-layer", "line-color", "#ffffff");
  map.setPaintProperty("assignment-lines-layer", "line-width", 1.5);
  map.setPaintProperty("assignment-lines-layer", "line-dasharray", [2, 2]);

  map.setPaintProperty("staff-lines-layer", "line-color", [
    "match", ["get", "type"], "LO", "#3B82F6", "EFE", "#10B981", "#ccc"
  ]);
  map.setPaintProperty("staff-lines-layer", "line-width", 1.5);
  map.setPaintProperty("staff-lines-layer", "line-dasharray", [1, 3]);
  map.setPaintProperty("unclustered-fe1", "circle-opacity", 1);
  map.setPaintProperty("unclustered-fe2", "circle-opacity", 1);
  map.setPaintProperty("unclustered-agencies", "circle-opacity", 1);
  map.setPaintProperty("unclustered-staff", "circle-opacity", 1);

}

function setupHighlighting() {
  map.on("click", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["unclustered-fe1", "unclustered-fe2", "unclustered-agencies", "unclustered-staff"]
    });

    if (features.length) {
      const name = features[0].properties.name;
      highlightLinesByEntity(name);
    } else {
      clearLineHighlights();
    }
  });
}

function updateMapLinesAfterEdit() {
  const assignmentLineFeatures = matchedStudents.map(student => {
    const studentGeo = geoCache[student.Location];
    const agency = allAgencies.find(a => a.Name === student.assignment);
    const agencyGeo = geoCache[agency?.Location];
    if (!studentGeo || !agencyGeo) return null;
    return {
      type: "Feature",
      properties: {
        student: student.Name,
        agency: agency.Name
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [studentGeo.lon, studentGeo.lat],
          [agencyGeo.lon, agencyGeo.lat]
        ]
      }
    };
  }).filter(Boolean);

  const staffLineFeatures = matchedStudents.flatMap(student => {
    const features = [];
    const studentGeo = geoCache[student.Location];
    if (!studentGeo) return features;

    const lo = sessionalStaffList.find(s => s.Name === student.assignedLO);
    const efe = sessionalStaffList.find(s => s.Name === student.assignedEFE);

    if (lo && geoCache[lo.Location]) {
      features.push({
        type: "Feature",
        properties: { student: student.Name, staff: lo.Name, type: "LO" },
        geometry: { type: "LineString", coordinates: [[studentGeo.lon, studentGeo.lat], [geoCache[lo.Location].lon, geoCache[lo.Location].lat]] }
      });
    }
    if (efe && geoCache[efe.Location]) {
      features.push({
        type: "Feature",
        properties: { student: student.Name, staff: efe.Name, type: "EFE" },
        geometry: { type: "LineString", coordinates: [[studentGeo.lon, studentGeo.lat], [geoCache[efe.Location].lon, geoCache[efe.Location].lat]] }
      });
    }

    return features;
  });

  map.getSource("assignment-lines").setData({
    type: "FeatureCollection",
    features: assignmentLineFeatures
  });

  map.getSource("staff-lines").setData({
    type: "FeatureCollection",
    features: staffLineFeatures
  });
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

    // Fetch sessional staff from Firebase
    const staffQuery = query(collection(db, "sessional_staff"))
    const staffSnapshot = await getDocs(staffQuery)
    const sessionalStaffList = staffSnapshot.docs.map((doc) => doc.data())


    return { fe1Students, fe2Students, agencies, sessionalStaffList }
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

function assignSessionalStaff(students, sessionalStaff, geoCache, agencies) {
  const staffAssignmentCounts = {};

  // Initialize counters
  sessionalStaff.forEach(s => {
    staffAssignmentCounts[s.Name] = {
      LO: s.LO || 0,
      EFE: s.EFE || 0,
    };
  });

  const parseSectors = (str) => {
    if (!str) return [];
    return str.split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
  };

  const getDistance = (loc1, loc2) => {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLon = toRad(loc2.lon - loc1.lon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  students.forEach((student) => {
    const studentLoc = geoCache[student.Location];
    const agency = agencies.find(a => a.Name === student.assignment);
    const agencySectors = parseSectors(agency?.Sector || "");

    if (!studentLoc || !agency) return;

    const assignStaff = (role) => {
      return sessionalStaff
        .filter(s =>
          s.Role === role &&
          staffAssignmentCounts[s.Name][role] > 0 &&
          (!student.assignedLO || s.Name !== student.assignedLO) &&
          (!student.assignedEFE || s.Name !== student.assignedEFE) &&
          geoCache[s.Location]
        )
        .map(s => {
          const staffLoc = geoCache[s.Location];
          const distance = getDistance(staffLoc, studentLoc);
          const sectorMatch = parseSectors(s.Sector).some(sec => agencySectors.includes(sec));
          const sectorScore = sectorMatch ? 50 : 0;
          const locationScore = Math.max(0, 50 - distance);
          const totalScore = sectorScore + locationScore;
          return { staff: s, totalScore };
        })
        .sort((a, b) => b.totalScore - a.totalScore)[0]?.staff;
    };

    // Assign LO
    const lo = assignStaff("LO");
    if (lo) {
      student.assignedLO = lo.Name;
      staffAssignmentCounts[lo.Name].LO--;
      console.log(`Assigned LO ${lo.Name} to ${student.Name}`);
    }

    // Assign EFE if no onsite supervisor
    const agencyHasSupervisor = agency["Onsite SW Supervisor"]?.toLowerCase() === "yes";
    if (!agencyHasSupervisor) {
      const efe = assignStaff("EFE");
      if (efe && efe.Name !== student.assignedLO) {
        student.assignedEFE = efe.Name;
        staffAssignmentCounts[efe.Name].EFE--;
        console.log(`Assigned EFE ${efe.Name} to ${student.Name}`);
      }
    }
  });
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

function renderUnassignedStaffList(staffList) {
  if (!staffList.length) return "<em>All staff assigned</em>";
  return "<ul class='mb-1'>" + staffList.map((s) =>
    `<li>${s.Name} (${(s.LO > 0 ? "LO" : "")}${s.LO > 0 && s.EFE > 0 ? " & " : ""}${s.EFE > 0 ? "EFE" : ""})</li>`
  ).join("") + "</ul>";
}

const assignedStaffNames = new Set();

matchedStudents.forEach((s) => {
  if (s.assignedLO) assignedStaffNames.add(s.assignedLO);
  if (s.assignedEFE) assignedStaffNames.add(s.assignedEFE);
});

const uniqueStaffByName = new Map();
sessionalStaffList.forEach((s) => {
  if (!uniqueStaffByName.has(s.Name)) {
    uniqueStaffByName.set(s.Name, { ...s, LO: 0, EFE: 0 });
  }
  const existing = uniqueStaffByName.get(s.Name);
  existing.LO += s.Role === "LO" ? 1 : 0;
  existing.EFE += s.Role === "EFE" ? 1 : 0;
});

const unassignedStaff = Array.from(uniqueStaffByName.values()).filter(
  (s) => !assignedStaffNames.has(s.Name)
);



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

    <details class="mt-2">
    <summary>👥 <strong>Unassigned Sessional Staff</strong></summary>
      ${renderUnassignedStaffList(unassignedStaff)}
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
  <div class="small text-muted">
    Assigned LO: <strong>${student.assignedLO || "None"}</strong> | 
    Assigned EFE: <strong>${student.assignedEFE || "None"}</strong>
  </div>
  ${scoreHtml}
`

const agencyOptions = allAgencies.map(a => `<option value="${a.Name}">${a.Name}</option>`).join("");
    const staffNames = [...new Set(sessionalStaffList.map(s => s.Name))];
    const loOptions = staffNames.map(name => `<option value="${name}">${name}</option>`).join("");
    const efeOptions = ['<option value="">None</option>', ...staffNames.map(name => `<option value="${name}">${name}</option>`)].join("");
    
    const dropdownsHtml = `
      <div class="assignment-controls d-flex flex-wrap align-items-end gap-2 mt-2 mb-3">
      <div class="form-group me-2">
        <label>Agency:</label>
        <select class="form-control agency-select" data-student="${student.Name}">
          <option value="">-- Select Agency --</option>
          ${agencyOptions}
        </select>
      </div>

      <div class="form-group me-2">
        <label>LO:</label>
        <select class="form-control lo-select" data-student="${student.Name}">
          <option value="">-- Select LO --</option>
          ${loOptions}
        </select>
      </div>

      <div class="form-group me-2">
        <label>EFE:</label>
        <select class="form-control efe-select" data-student="${student.Name}">
          ${efeOptions}
        </select>
      </div>

      <div class="form-group">
        <label>&nbsp;</label>
        <button class="btn btn-outline-primary d-block save-assignment-btn" data-student="${student.Name}">Save</button>
      </div>
    </div>

    `;
    

studentDiv.innerHTML += dropdownsHtml;




    fe2Results.appendChild(studentDiv)

  
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
      <div class="small text-muted">
        Assigned LO: <strong>${student.assignedLO || "None"}</strong> | 
        Assigned EFE: <strong>${student.assignedEFE || "None"}</strong>
      </div>
      ${scoreHtml}
    `

    const agencyOptions = allAgencies.map(a => `<option value="${a.Name}">${a.Name}</option>`).join("");
    const staffNames = [...new Set(sessionalStaffList.map(s => s.Name))];
    const loOptions = staffNames.map(name => `<option value="${name}">${name}</option>`).join("");
    const efeOptions = ['<option value="">None</option>', ...staffNames.map(name => `<option value="${name}">${name}</option>`)].join("");
    
    const dropdownsHtml = `
      <div class="assignment-controls d-flex flex-wrap align-items-end gap-2 mt-2 mb-3">
      <div class="form-group me-2">
        <label>Agency:</label>
        <select class="form-control agency-select" data-student="${student.Name}">
          <option value="">-- Select Agency --</option>
          ${agencyOptions}
        </select>
      </div>

      <div class="form-group me-2">
        <label>LO:</label>
        <select class="form-control lo-select" data-student="${student.Name}">
          <option value="">-- Select LO --</option>
          ${loOptions}
        </select>
      </div>

      <div class="form-group me-2">
        <label>EFE:</label>
        <select class="form-control efe-select" data-student="${student.Name}">
          ${efeOptions}
        </select>
      </div>

      <div class="form-group">
        <label>&nbsp;</label>
        <button class="btn btn-outline-primary d-block save-assignment-btn" data-student="${student.Name}">Save</button>
      </div>
    </div>

    `;
    

studentDiv.innerHTML += dropdownsHtml;
  

    fe1Results.appendChild(studentDiv)

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
      const agencyOptions = allAgencies.map(a => `<option value="${a.Name}">${a.Name}</option>`).join("");
    const staffNames = [...new Set(sessionalStaffList.map(s => s.Name))];
    const loOptions = staffNames.map(name => `<option value="${name}">${name}</option>`).join("");
    const efeOptions = ['<option value="">None</option>', ...staffNames.map(name => `<option value="${name}">${name}</option>`)].join("");
    
    const dropdownsHtml = `
      <div class="assignment-controls mt-2 mb-3">
        <div class="form-group mb-2">
          <label>Agency:</label>
          <select class="form-control agency-select" data-student="${student.Name}">
            <option value="">-- Select Agency --</option>
            ${agencyOptions}
          </select>
        </div>
    
        <div class="form-group mb-2">
          <label>LO:</label>
          <select class="form-control lo-select" data-student="${student.Name}">
            <option value="">-- Select LO --</option>
            ${loOptions}
          </select>
        </div>
    
        <div class="form-group mb-2">
          <label>EFE:</label>
          <select class="form-control efe-select" data-student="${student.Name}">
            ${efeOptions}
          </select>
        </div>
    
        <button class="btn btn-outline-primary save-assignment-btn" data-student="${student.Name}">Save</button>
      </div>
    `;
    

      studentDiv.innerHTML += dropdownsHtml;

      unassignedResults.appendChild(studentDiv)
    }
  }

  document.querySelectorAll(".save-assignment-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const studentName = e.target.getAttribute("data-student");
      const student = matchedStudents.find(s => s.Name === studentName);
      if (!student) return;
  
      const agency = document.querySelector(`.agency-select[data-student="${studentName}"]`).value;
      const lo = document.querySelector(`.lo-select[data-student="${studentName}"]`).value;
      const efe = document.querySelector(`.efe-select[data-student="${studentName}"]`).value;
  
      student.assignment = agency;
      student.assignedLO = lo;
      student.assignedEFE = efe;
  
      const agencyObj = allAgencies.find(a => a.Name === agency);
      if (agencyObj) {
        student.scoreDetails = calculateMatchScore(student, agencyObj, geoCache);
        student.matchScore = student.scoreDetails.total;
        student.assignedSector = agencyObj.Sector;
      }
  
      updateMapLinesAfterEdit();
      const updatedScore = (
        matchedStudents.reduce((sum, s) => sum + (s.matchScore || 0), 0) /
        (matchedStudents.length * 100)
      ) * 100;
      
      displayResults({ matchScore: updatedScore.toFixed(2) }, fe2Students, fe1Students);
      
      notyf.success(`Updated ${studentName}'s assignments`);
    });
  });
  
  
 

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
      "Assigned LO": s.assignedLO || "",
      "Assigned EFE": s.assignedEFE || "",
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
      "Assigned LO": s.assignedLO || "",
      "Assigned EFE": s.assignedEFE || "",
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

  // Generate sessional staff summary
const staffSummaryMap = new Map();

[...matchedStudents, ...unassignedStudents].forEach((student) => {
  if (student.assignedLO) {
    if (!staffSummaryMap.has(student.assignedLO)) {
      staffSummaryMap.set(student.assignedLO, { name: student.assignedLO, role: "LO", assigned: 0 });
    }
    staffSummaryMap.get(student.assignedLO).assigned += 1;
  }
  if (student.assignedEFE) {
    if (!staffSummaryMap.has(student.assignedEFE)) {
      staffSummaryMap.set(student.assignedEFE, { name: student.assignedEFE, role: "EFE", assigned: 0 });
    } else if (staffSummaryMap.get(student.assignedEFE).role === "LO") {
      staffSummaryMap.get(student.assignedEFE).role = "LO & EFE";
    }
    staffSummaryMap.get(student.assignedEFE).assigned += 1;
  }
});

const staffSummaryData = Array.from(staffSummaryMap.values()).map((s) => {
  const original = sessionalStaffList.find((staff) => staff.Name === s.name) || {};
  return {
    "Staff Name": s.name,
    "Role": s.role,
    "Assigned Students": s.assigned,
    "LO Capacity": original.LO || 0,
    "EFE Capacity": original.EFE || 0,
    "Remaining LO": (original.LO || 0) - (s.role.includes("LO") ? s.assigned : 0),
    "Remaining EFE": (original.EFE || 0) - (s.role.includes("EFE") ? s.assigned : 0),
    "Sectors": original.Sector || "",
    "Location": original.Location || ""
  };
});


  // Add worksheets to workbook
  const ws0 = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws0, "Summary")

  const ws1 = XLSX.utils.json_to_sheet(fe2Data)
  XLSX.utils.book_append_sheet(wb, ws1, "FE2 Students")

  const ws2 = XLSX.utils.json_to_sheet(fe1Data)
  XLSX.utils.book_append_sheet(wb, ws2, "FE1 Students")

  const ws3 = XLSX.utils.json_to_sheet(unassignedData)
  XLSX.utils.book_append_sheet(wb, ws3, "Unassigned Students")

  const ws4 = XLSX.utils.json_to_sheet(staffSummaryData);
  XLSX.utils.book_append_sheet(wb, ws4, "Sessional Staff Summary");


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

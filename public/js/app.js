//app.js
// Mapbox access token from config file
// Fetch the config.json file
fetch('../config.json')
    .then(response => response.json())
    .then(config => {
        // Check if the token is correctly fetched
        console.log("Mapbox Token: ", config.mapboxToken);
        
        if (config.mapboxToken) {
            mapboxgl.accessToken = config.mapboxToken;  // Assign the token
            
            // Initialize the map after assigning the token
            const map = new mapboxgl.Map({
                container: 'map',  // ID of your map container
                style: 'mapbox://styles/mapbox/navigation-night-v1',  // Map style
                center: [115.8613, -31.9523],  // Perth coordinates
                zoom: 10  // Zoom level
            });
        } else {
            console.error('Mapbox token is missing or incorrect.');
        }
    })
    .catch(error => console.error('Error loading config:', error));



// Sample data for demonstration
const stakeholders = [
    // Students
    {
        id: 1,
        name: "Alice Smith",
        type: "student",
        location: [115.8613, -31.9523], 
        suburb: "Perth",
        region: "Central",
        interests: ["mental-health", "youth"]
    },
    {
        id: 2,
        name: "Bob Johnson",
        type: "student",
        location: [115.7639, -31.8982], 
        suburb: "Subiaco",
        region: "Central",
        interests: ["homelessness", "justice"]
    },
    {
        id: 3,
        name: "Charlie Brown",
        type: "student",
        location: [115.9006, -31.9609], 
        suburb: "Victoria Park",
        region: "SOR",
        interests: ["aged-care", "disability"]
    },
    {
        id: 4,
        name: "Diana Prince",
        type: "student",
        location: [115.7471, -32.0383],
        region: "SOR",
        interests: ["mental-health", "homelessness"]
    },
    {
        id: 5,
        name: "Ethan Hunt",
        type: "student",
        location: [115.8075, -31.8927],
        suburb: "Leederville",
        region: "Central",
        interests: ["youth", "justice"]
    },
    {
        id: 6,
        name: "Fiona Green",
        type: "student",
        location: [115.8005, -31.8148],
        suburb: "Scarborough",
        region: "NOR",
        interests: ["mental-health", "disability"]
    },
    
    // Agencies
    {
        id: 7,
        name: "Mental Health Support Center",
        type: "agency",
        location: [115.8733, -31.9478], 
        suburb: "East Perth",
        region: "Central",
        interests: ["mental-health"],
        capacity: 3,
        description: "Provides mental health support services to the community."
    },
    {
        id: 8,
        name: "Homeless Connect",
        type: "agency",
        location: [115.8583, -31.9535], 
        suburb: "Perth",
        region: "Central",
        interests: ["homelessness"],
        capacity: 2,
        description: "Supports homeless individuals with housing and essential services."
    },
    {
        id: 9,
        name: "Youth Development Center",
        type: "agency",
        location: [115.8941, -31.8982], 
        suburb: "Maylands",
        region: "NOR",
        interests: ["youth"],
        capacity: 4,
        description: "Provides programs and support for at-risk youth."
    },
    {
        id: 10,
        name: "Justice Advocacy Group",
        type: "agency",
        location: [115.8589, -31.9559],
        suburb: "Perth",
        region: "Central",
        interests: ["justice"],
        capacity: 2,
        description: "Advocates for justice system reform and supports individuals in the system."
    },
    {
        id: 11,
        name: "Aged Care Facility",
        type: "agency",
        location: [115.7639, -32.0383],
        suburb: "Fremantle",
        region: "SOR",
        interests: ["aged-care"],
        capacity: 3,
        description: "Provides care and support for elderly residents."
    },
    {
        id: 12,
        name: "Disability Support Services",
        type: "agency",
        location: [115.9006, -31.8982], 
        suburb: "Morley",
        region: "NOR",
        interests: ["disability"],
        capacity: 2,
        description: "Offers support services for individuals with disabilities."
    },
    {
        id: 13,
        name: "Rural Health Initiative",
        type: "agency",
        location: [116.7152, -33.3283],
        suburb: "Albany",
        region: "Rural",
        interests: ["mental-health", "aged-care"],
        capacity: 2,
        description: "Provides health services to rural communities."
    },
    
    // UWA Staff
    {
        id: 14,
        name: "Dr. Jane Wilson",
        type: "staff",
        location: [115.8175, -31.9809],
        suburb: "Crawley",
        region: "Central",
        interests: ["mental-health", "youth"],
        capacity: 3,
        role: "Field Educator"
    },
    {
        id: 15,
        name: "Prof. Michael Lee",
        type: "staff",
        location: [115.8175, -31.9809],
        suburb: "Crawley",
        region: "Central",
        interests: ["justice", "homelessness"],
        capacity: 2,
        role: "Liaison Officer"
    },
    {
        id: 16,
        name: "Dr. Sarah Johnson",
        type: "staff",
        location: [115.8175, -31.9809], 
        suburb: "Crawley",
        region: "Central",
        interests: ["aged-care", "disability"],
        capacity: 4,
        role: "Field Educator & Liaison Officer"
    },
    {
        id: 17,
        name: "Dr. Robert Chen",
        type: "staff",
        location: [115.8941, -31.9609], 
        suburb: "Victoria Park",
        region: "SOR",
        interests: ["mental-health", "youth"],
        capacity: 3,
        role: "Field Educator"
    },
    {
        id: 18,
        name: "Prof. Emily Davis",
        type: "staff",
        location: [115.7639, -31.8148], 
        suburb: "Scarborough",
        region: "NOR",
        interests: ["homelessness", "justice"],
        capacity: 2,
        role: "Liaison Officer"
    }
];

// Current filter state
let filters = {
    stakeholderType: "all",
    region: "all",
    interest: "all",
    search: ""
};

// Add markers to the map
const markers = [];

function addMarkers() {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers.length = 0;
    
    // Filter stakeholders based on current filters
    const filteredStakeholders = stakeholders.filter(stakeholder => {
        const typeMatch = filters.stakeholderType === "all" || stakeholder.type === filters.stakeholderType;
        const regionMatch = filters.region === "all" || stakeholder.region === filters.region;
        const interestMatch = filters.interest === "all" || stakeholder.interests.includes(filters.interest);
        const searchMatch = filters.search === "" || 
                           stakeholder.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           stakeholder.suburb.toLowerCase().includes(filters.search.toLowerCase());
        
        return typeMatch && regionMatch && interestMatch && searchMatch;
    });
    
    // Add markers for filtered stakeholders
    filteredStakeholders.forEach(stakeholder => {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        
        // Set marker color based on stakeholder type
        if (stakeholder.type === "student") {
            el.style.backgroundColor = "#3498db"; // Blue
        } else if (stakeholder.type === "agency") {
            el.style.backgroundColor = "#e74c3c"; // Red
            el.textContent = stakeholder.capacity;
        } else if (stakeholder.type === "staff") {
            el.style.backgroundColor = "#2ecc71"; // Green
            el.textContent = stakeholder.capacity;
        }
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
                <div class="popup">
                    <h3>${stakeholder.name}</h3>
                    <p><strong>Type:</strong> ${stakeholder.type.charAt(0).toUpperCase() + stakeholder.type.slice(1)}</p>
                    <p><strong>Location:</strong> ${stakeholder.suburb}, ${stakeholder.region}</p>
                    ${stakeholder.interests ? `<p><strong>Interests:</strong> ${stakeholder.interests.map(i => i.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(', ')}</p>` : ''}
                    ${stakeholder.description ? `<p><strong>Description:</strong> ${stakeholder.description}</p>` : ''}
                    ${stakeholder.role ? `<p><strong>Role:</strong> ${stakeholder.role}</p>` : ''}
                    ${stakeholder.capacity ? `<p class="capacity">Available Spots: ${stakeholder.capacity}</p>` : ''}
                </div>
            `);
        
        // Create marker
        const marker = new mapboxgl.Marker(el)
            .setLngLat(stakeholder.location)
            .setPopup(popup)
            .addTo(map);
        
        markers.push(marker);
    });
    
    // Update stats
    /*updateStats(filteredStakeholders);*/
}

/* function updateStats(filteredStakeholders) {
    const students = filteredStakeholders.filter(s => s.type === "student");
    const agencies = filteredStakeholders.filter(s => s.type === "agency");
    const staff = filteredStakeholders.filter(s => s.type === "staff");
    
    document.getElementById("student-count").textContent = students.length;
    document.getElementById("agency-count").textContent = agencies.length;
    document.getElementById("staff-count").textContent = staff.length;
    
    const agencySpots = agencies.reduce((total, agency) => total + agency.capacity, 0);
    const staffCapacity = staff.reduce((total, staffMember) => total + staffMember.capacity, 0);
    
    document.getElementById("agency-spots").textContent = agencySpots;
    document.getElementById("staff-capacity").textContent = staffCapacity;
}*/

// Event listeners for filters
document.getElementById("stakeholder-filters").addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-option")) {
        // Update active class
        document.querySelectorAll("#stakeholder-filters .filter-option").forEach(el => {
            el.classList.remove("active");
        });
        e.target.classList.add("active");
        
        // Update filter
        filters.stakeholderType = e.target.dataset.type;
        addMarkers();
    }
});

document.getElementById("region-filters").addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-option")) {
        // Update active class
        document.querySelectorAll("#region-filters .filter-option").forEach(el => {
            el.classList.remove("active");
        });
        e.target.classList.add("active");
        
        // Update filter
        filters.region = e.target.dataset.region;
        addMarkers();
    }
});

document.getElementById("interest-filters").addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-option")) {
        // Update active class
        document.querySelectorAll("#interest-filters .filter-option").forEach(el => {
            el.classList.remove("active");
        });
        e.target.classList.add("active");
        
        // Update filter
        filters.interest = e.target.dataset.interest;
        addMarkers();
    }
});

document.getElementById("search").addEventListener("input", (e) => {
    filters.search = e.target.value;
    console.log(filters.search)
    addMarkers();
});

// Initialize map
map.on('load', () => {
    addMarkers();
});


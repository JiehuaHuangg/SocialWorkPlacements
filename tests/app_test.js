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

    // We define a buffer of 0.3 degrees (~30 km), since 1 degree ≈ 111 km on Earth
  // This buffer helps classify locations into broader regions:
  // - North/South if latitude differs significantly
  // - East/West if longitude differs significantly
  // - Central if both latitude and longitude are within 0.3 degrees of Perth
  // - Rural if it doesn't fall into any of the above

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
module.exports = {
  extractSuburb,
  determineRegion,
};

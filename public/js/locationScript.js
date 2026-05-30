// List of places for dropdown search suggestions
let places = [];
async function fetchCities() {
    try {
        const response = await fetch('/api/cities');
        if (response.ok) {
            places = await response.json();
            // Add some defaults if none found in DB
            if (places.length === 0) {
                places = ["Delhi", "Hoshiarpur", "Mumbai", "Chandigarh", "Bangalore", "Kolkata", "Chennai", "Hyderabad"];
            }
        }
    } catch (err) {
        console.error('Error fetching cities:', err);
        places = ["Delhi", "Hoshiarpur", "Mumbai", "Chandigarh", "Bangalore", "Kolkata", "Chennai", "Hyderabad"];
    }
}
fetchCities();
const input = document.getElementById('input');
const searchBtn = document.getElementById('search-btn');
const dropdown = document.getElementById('dropdown');
const nearMeBtn = document.getElementById('near-me-btn');

if (!input || !searchBtn || !dropdown) {
    window.addEventListener('load', checkAndUpdateLocation);
} else {

let activeIndex = -1;
let currentSuggestions = [];

function removeActiveHighlight() {
    const items = dropdown.querySelectorAll('.suggestion-item');
    items.forEach(item => {
        item.classList.remove('bg-primary/10', 'text-primary');
    });
}

function updateActiveSuggestion() {
    removeActiveHighlight();
    if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
        const items = dropdown.querySelectorAll('.suggestion-item');
        const activeItem = items[activeIndex];
        if (activeItem) {
            activeItem.classList.add('bg-primary/10', 'text-primary');
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
}

// Function to filter and display suggestions based on input
input.addEventListener('input', function () {
    const inputValue = input.value.trim().toLowerCase();
    dropdown.innerHTML = ''; // Clear previous suggestions
    currentSuggestions = [];
    activeIndex = -1; // Reset active suggestion index

    if (inputValue) {
        const filteredPlaces = places.filter(place => 
            place.toLowerCase().includes(inputValue)
        ).slice(0, 10);

        currentSuggestions = filteredPlaces;

        // Show suggestions if available
        if (filteredPlaces.length > 0) {
            dropdown.style.display = 'block';
            filteredPlaces.forEach((place, index) => {
                const div = document.createElement('div');
                div.textContent = place;
                // Add premium Tailwind CSS classes matching the clean green/white UI
                div.className = "px-4 py-3 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer font-bold transition-all duration-200 text-sm text-text-primary suggestion-item";
                div.dataset.index = index;

                // Sync mouse hover with keyboard highlighted activeIndex
                div.addEventListener('mouseenter', function () {
                    activeIndex = index;
                    updateActiveSuggestion();
                });

                // On clicking a suggestion, trigger search immediately for premium UX
                div.addEventListener('click', function () {
                    input.value = place;
                    dropdown.innerHTML = ''; // Clear dropdown
                    dropdown.style.display = 'none'; // Hide dropdown
                    window.location.href = `/search-page?city=${encodeURIComponent(place)}`;
                });

                dropdown.appendChild(div);
            });
        } else {
            dropdown.style.display = 'none';
        }
    } else {
        dropdown.style.display = 'none';
    }
});

// Hide dropdown when clicking outside
document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// Enable/disable the search button based on input
input.addEventListener('input', function () {
    searchBtn.disabled = input.value.trim() === '';
});

// Handle keydown on search input field to support arrow keys, escape, and enter
input.addEventListener('keydown', function (e) {
    const isDropdownOpen = dropdown.style.display === 'block';

    if (isDropdownOpen) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentSuggestions.length > 0) {
                activeIndex = (activeIndex + 1) % currentSuggestions.length;
                updateActiveSuggestion();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentSuggestions.length > 0) {
                activeIndex = (activeIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
                updateActiveSuggestion();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
                const items = dropdown.querySelectorAll('.suggestion-item');
                if (items[activeIndex]) {
                    items[activeIndex].click();
                }
            } else {
                const inputValue = input.value.trim();
                if (inputValue) {
                    searchBtn.click();
                }
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    } else {
        if (e.key === 'Enter') {
            const inputValue = input.value.trim();
            if (inputValue) {
                searchBtn.click();
            }
        }
    }
});

// Button click handler for search (uses absolute routing path)
searchBtn.addEventListener('click', function () {
    const inputValue = input.value.trim();

    if (inputValue) {
        console.log("Searching for:", inputValue);
        window.location.href = `/search-page?city=${encodeURIComponent(inputValue)}`;
        input.value = ""; // Clear the input field
        dropdown.innerHTML = ''; // Clear dropdown
        dropdown.style.display = 'none'; // Hide dropdown
        searchBtn.disabled = true; // Disable search button after click
    }
});

// Get distance between two coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLon / 2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Check and update location if needed
function checkAndUpdateLocation() {
    const storedLat = localStorage.getItem('userLat');
    const storedLng = localStorage.getItem('userLng');
    const storedTime = localStorage.getItem('locationTimestamp');
    const currentTime = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds

    // If location is not stored, data is older than a week, or user moved >2km, request new location
    if (!storedLat || !storedLng || !storedTime || 
        (currentTime - storedTime > oneWeek) || 
        getDistanceFromLatLonInKm(storedLat, storedLng, localStorage.getItem('userLat'), localStorage.getItem('userLng')) > 2) {
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                const { latitude, longitude } = position.coords;
                // Store new location and timestamp in localStorage
                localStorage.setItem('userLat', latitude);
                localStorage.setItem('userLng', longitude);
                localStorage.setItem('locationTimestamp', Date.now());
            }, function (error) {
                console.log('Error getting location:', error);
            });
        } else {
            console.log("Geolocation is not supported by this browser.");
        }
    }
}

// Check location on page load
window.addEventListener('load', checkAndUpdateLocation);

// "Near Me" button functionality to open search with user's location
if (nearMeBtn) {
nearMeBtn.addEventListener('click', function () {
    const userLat = localStorage.getItem('userLat');
    const userLng = localStorage.getItem('userLng');

    if (userLat && userLng) {
        window.open(`/search-page?lat=${userLat}&lng=${userLng}`, "_blank");
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            window.open(`/search-page?lat=${latitude}&lng=${longitude}`, "_blank");
        }, function () {
            alert('Unable to retrieve your location.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});
}

}



//            <!-- <script>
//            const places = ["Delhi", "Hoshiarpur", "Mumbai", "Chandigarh", "Bangalore", "Kolkata", "Chennai", "Hyderabad"];
//            const input = document.getElementById('input');
//            const searchBtn = document.getElementById('search-btn');
//            const dropdown = document.getElementById('dropdown');
       
//            // Function to filter and display suggestions based on input
//            input.addEventListener('input', function () {
//                const inputValue = input.value.trim().toLowerCase();
//                dropdown.innerHTML = ''; // Clear previous suggestions
       
//                if (inputValue) {
//                    const filteredPlaces = places.filter(place => 
//                        place.toLowerCase().includes(inputValue)
//                    );
       
//                    // Show suggestions if available
//                    if (filteredPlaces.length > 0) {
//                        dropdown.style.display = 'block';
//                        filteredPlaces.forEach(place => {
//                            const div = document.createElement('div');
//                            div.textContent = place;
//                            div.classList.add('dropdown-item'); // Optional styling
       
//                            // On clicking a suggestion, fill input with the selected value
//                            div.addEventListener('click', function () {
//                                input.value = place;
//                                dropdown.innerHTML = ''; // Clear dropdown
//                                dropdown.style.display = 'none'; // Hide dropdown
//                                searchBtn.disabled = false; // Enable search button after selection
//                            });
       
//                            dropdown.appendChild(div);
//                        });
//                    } else {
//                        dropdown.style.display = 'none';
//                    }
//                } else {
//                    dropdown.style.display = 'none';
//                }
//            });
       
//            // Hide dropdown when clicking outside
//            document.addEventListener('click', function (e) {
//                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
//                    dropdown.style.display = 'none';
//                }
//            });
       
//            // Event listener to enable/disable the button based on input
//            input.addEventListener('input', function () {
//                if (input.value.trim() === '') {
//                    searchBtn.disabled = true;
//                } else {
//                    searchBtn.disabled = false;
//                }
//            });
       
//            // Button click handler for searching
//            searchBtn.addEventListener('click', function () {
//                let inputValue = input.value.trim().toLowerCase();
       
//                if (inputValue === "hoshiarpur") {
//                    console.log("clicked");
//                    window.open("search-page", "_blank");
//                    input.value = ""; // Clear the input field
//                    dropdown.innerHTML = ''; // Clear dropdown
//                    dropdown.style.display = 'none'; // Hide dropdown
//                    searchBtn.disabled = true; // Disable search button after click
//                } else {
//                    window.open("404");
//                }
//            });

//            document.getElementById('near-me-btn').addEventListener('click', function () {
//    if (navigator.geolocation) {
//        navigator.geolocation.getCurrentPosition(function (position) {
//            const latitude = position.coords.latitude;
//            const longitude = position.coords.longitude;

//            // Here you can implement logic to find nearby locations based on the latitude and longitude.
//            // For example, you can use an API like Google Places or use a static list of places with coordinates.

//            // For demonstration purposes, let's log the coordinates
//            console.log('Latitude:', latitude);
//            console.log('Longitude:', longitude);

//            // Example: Open a search page with the coordinates (you might want to customize this)
//            window.open(`search-page?lat=${latitude}&lng=${longitude}`, "_blank");
//        }, function () {
//            alert('Unable to retrieve your location.');
//        });
//    } else {
//        alert('Geolocation is not supported by this browser.');
//    }
// });



//        </script>
      
//       <script>
//        // Function to calculate distance between two coordinates
//        function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
//          const R = 6371; // Radius of Earth in km
//          const dLat = deg2rad(lat2 - lat1);
//          const dLon = deg2rad(lon2 - lon1);
//          const a = Math.sin(dLat / 2) * Math.sin(dLon / 2) +
//                    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
//                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
//          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//          return R * c;
//        }
     
//        function deg2rad(deg) {
//          return deg * (Math.PI / 180);
//        }
     
//        // Check and update location if needed
//        function checkAndUpdateLocation() {
//          const storedLat = localStorage.getItem('userLat');
//          const storedLng = localStorage.getItem('userLng');
//          const storedTime = localStorage.getItem('locationTimestamp');
//          const currentTime = Date.now();
//          const oneWeek = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
     
//          // If location is not stored, or data is older than a week, or user moved >2km, request new location
//          if (!storedLat || !storedLng || !storedTime || 
//              (currentTime - storedTime > oneWeek) || 
//              getDistanceFromLatLonInKm(storedLat, storedLng, sessionStorage.getItem('userLat'), sessionStorage.getItem('userLng')) > 2) {
           
//            if (navigator.geolocation) {
//              navigator.geolocation.getCurrentPosition(function (position) {
//                const { latitude, longitude } = position.coords;
//                // Store new location and timestamp in localStorage
//                localStorage.setItem('userLat', latitude);
//                localStorage.setItem('userLng', longitude);
//                localStorage.setItem('locationTimestamp', Date.now());
//              }, function (error) {
//                console.log('Error getting location:', error);
//              });
//            } else {
//              console.log("Geolocation is not supported by this browser.");
//            }
//          }
//        }
     
//        // Run the check and update on page load
//        window.onload = checkAndUpdateLocation;
//      </script>
     
// <script>
//    document.getElementById('searchButton').onclick = function () {
//      const userLat = sessionStorage.getItem('userLat');
//      const userLng = sessionStorage.getItem('userLng');
//      if (userLat && userLng) {
//        window.location.href = `/search-page?lat=${userLat}&lng=${userLng}`;
//      } else {
//        alert("Location is required for this feature.");
//      }
//    };
//  </script>
//   -->
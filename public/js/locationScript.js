// List of places for dropdown search suggestions
let places = ["Delhi"];
async function fetchCities() {
    try {
        const response = await fetch('/api/cities');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                places = data;
            }
        }
    } catch (err) {
        console.error('Error fetching cities from backend, using pre-populated static list:', err);
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
let ignoreBackdropClick = false;

function armBackdropIgnore() {
    ignoreBackdropClick = true;
    setTimeout(() => {
        ignoreBackdropClick = false;
    }, 250);
}

// Overlay elements declarations
const searchOverlay = document.getElementById('search-overlay');
const overlaySearchCard = document.getElementById('overlay-search-card');
const overlayInput = document.getElementById('overlay-input');
const overlaySearchBtn = document.getElementById('overlay-search-btn');
const overlayDropdown = document.getElementById('overlay-dropdown');
const overlayNearMeBtn = document.getElementById('overlay-near-me-btn');
const closeOverlayBtn = document.getElementById('close-overlay-btn');

function removeActiveHighlight() {
    const items = overlayDropdown.querySelectorAll('.suggestion-item');
    items.forEach(item => {
        item.classList.remove('bg-primary/10', 'text-primary');
    });
}

function updateActiveSuggestion() {
    removeActiveHighlight();
    if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
        const items = overlayDropdown.querySelectorAll('.suggestion-item');
        const activeItem = items[activeIndex];
        if (activeItem) {
            activeItem.classList.add('bg-primary/10', 'text-primary');
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
}

// Function to populate and display popular cities when focused/clicked dynamically inside the overlay
function showPopularCities() {
    overlayDropdown.innerHTML = '';
    const popularCities = places.slice(0, 12);
    currentSuggestions = popularCities;
    activeIndex = -1;

    // A beautiful section header matching the premium green/white/gold theme
    const header = document.createElement('div');
    header.className = "px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-text-secondary border-b border-border-color-light mb-2 flex items-center gap-2 select-none";
    header.innerHTML = `<i class="fa-solid fa-fire text-amber-500 animate-pulse text-xs"></i> <span>Popular Cities</span>`;
    overlayDropdown.appendChild(header);

    popularCities.forEach((city, index) => {
        const div = document.createElement('div');
        div.className = "px-4 py-3 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer font-bold transition-all duration-200 text-sm text-text-primary suggestion-item flex items-center justify-between group";
        
        // Premium list row format with icon & micro animation
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fa-solid fa-location-dot text-text-secondary group-hover:text-primary transition-colors text-xs"></i>
                <span>${city}</span>
            </div>
            <i class="fa-solid fa-chevron-right opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[10px] text-primary"></i>
        `;
        div.dataset.index = index;

        // Sync hover with index
        div.addEventListener('mouseenter', function () {
            activeIndex = index;
            updateActiveSuggestion();
        });

        // Click handler to trigger search immediately
        div.addEventListener('click', function () {
            overlayInput.value = city;
            overlayDropdown.innerHTML = '';
            overlayDropdown.style.display = 'none';
            window.location.href = `/search-page?city=${encodeURIComponent(city)}`;
        });

        overlayDropdown.appendChild(div);
    });

    overlayDropdown.style.display = 'block';
}

// Function to handle open overlay
function openSearchOverlay() {
    armBackdropIgnore();
    searchOverlay.classList.remove('hidden');
    // Allow thread to register hidden removal before animating opacity & scale
    requestAnimationFrame(() => {
        searchOverlay.classList.add('opacity-100');
        overlaySearchCard.classList.remove('scale-95', 'opacity-0', '-translate-y-10');
        overlaySearchCard.classList.add('scale-100', 'opacity-100', 'translate-y-0');
        
        // Match home page search input value if any
        overlayInput.value = input.value;
        overlaySearchBtn.disabled = overlayInput.value.trim() === '';
        overlayInput.focus();
        
        if (overlayInput.value.trim() === '') {
            showPopularCities();
        } else {
            // Trigger input search automatically for initial letters
            overlayInput.dispatchEvent(new Event('input'));
        }
    });
}

// Function to handle close overlay
function closeSearchOverlay() {
    searchOverlay.classList.remove('opacity-100');
    overlaySearchCard.classList.add('scale-95', 'opacity-0', '-translate-y-10');
    overlaySearchCard.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
    
    // Sync home page input
    input.value = overlayInput.value;
    searchBtn.disabled = input.value.trim() === '';
    
    setTimeout(() => {
        searchOverlay.classList.add('hidden');
        input.blur();
    }, 300);
}

// Open overlay when clicking/focusing original input
input.addEventListener('focus', function (e) {
    e.preventDefault();
    e.stopPropagation();
    openSearchOverlay();
});

input.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    openSearchOverlay();
});

searchBtn.addEventListener('click', function (e) {
    e.stopPropagation();
});

nearMeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
});

// Close overlay when clicking close button, backdrop, or pressing Escape
if (closeOverlayBtn) {
    closeOverlayBtn.addEventListener('click', closeSearchOverlay);
}

searchOverlay.addEventListener('click', function (e) {
    if (ignoreBackdropClick) {
        return;
    }
    if (e.target === searchOverlay) {
        closeSearchOverlay();
    }
});

// Function to filter and display suggestions inside the overlay based on input
overlayInput.addEventListener('input', function () {
    const inputValue = overlayInput.value.trim().toLowerCase();
    overlayDropdown.innerHTML = ''; // Clear previous suggestions
    currentSuggestions = [];
    activeIndex = -1; // Reset active suggestion index

    if (inputValue) {
        const filteredPlaces = places.filter(place => 
            place.toLowerCase().includes(inputValue)
        ).slice(0, 10);

        currentSuggestions = filteredPlaces;

        // Show suggestions if available
        if (filteredPlaces.length > 0) {
            overlayDropdown.style.display = 'block';
            filteredPlaces.forEach((place, index) => {
                const div = document.createElement('div');
                div.className = "px-4 py-3 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer font-bold transition-all duration-200 text-sm text-text-primary suggestion-item flex items-center justify-between group";
                
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-location-dot text-text-secondary group-hover:text-primary transition-colors text-xs"></i>
                        <span>${place}</span>
                    </div>
                    <i class="fa-solid fa-arrow-right opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[10px] text-primary"></i>
                `;
                div.dataset.index = index;

                // Sync mouse hover with keyboard highlighted activeIndex
                div.addEventListener('mouseenter', function () {
                    activeIndex = index;
                    updateActiveSuggestion();
                });

                // On clicking a suggestion, trigger search immediately for premium UX
                div.addEventListener('click', function () {
                    overlayInput.value = place;
                    overlayDropdown.innerHTML = ''; // Clear dropdown
                    overlayDropdown.style.display = 'none'; // Hide dropdown
                    window.location.href = `/search-page?city=${encodeURIComponent(place)}`;
                });

                overlayDropdown.appendChild(div);
            });
        } else {
            overlayDropdown.style.display = 'none';
        }
    } else {
        // Clear input displays popular cities instead of hiding
        showPopularCities();
    }
});

// Hide dropdown when clicking outside
document.addEventListener('click', function (e) {
    if (searchOverlay && !searchOverlay.classList.contains('hidden')) {
        if (ignoreBackdropClick) {
            return;
        }
        const isTriggerElement = input.contains(e.target) || searchBtn.contains(e.target) || nearMeBtn.contains(e.target);
        if (!isTriggerElement && !overlayInput.contains(e.target) && !overlayDropdown.contains(e.target) && !closeOverlayBtn.contains(e.target) && !overlaySearchCard.contains(e.target)) {
            closeSearchOverlay();
        }
    }
});

// Enable/disable the search button based on input
overlayInput.addEventListener('input', function () {
    overlaySearchBtn.disabled = overlayInput.value.trim() === '';
});

// Handle keydown on search input field to support arrow keys, escape, and enter
overlayInput.addEventListener('keydown', function (e) {
    const isDropdownOpen = overlayDropdown.style.display === 'block';

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
                const items = overlayDropdown.querySelectorAll('.suggestion-item');
                if (items[activeIndex]) {
                    items[activeIndex].click();
                }
            } else {
                const inputValue = overlayInput.value.trim();
                if (inputValue) {
                    overlaySearchBtn.click();
                }
            }
        } else if (e.key === 'Escape') {
            closeSearchOverlay();
        }
    } else {
        if (e.key === 'Enter') {
            const inputValue = overlayInput.value.trim();
            if (inputValue) {
                overlaySearchBtn.click();
            }
        } else if (e.key === 'Escape') {
            closeSearchOverlay();
        }
    }
});

// Button click handler for search inside overlay
overlaySearchBtn.addEventListener('click', function () {
    const inputValue = overlayInput.value.trim();

    if (inputValue) {
        window.location.href = `/search-page?city=${encodeURIComponent(inputValue)}`;
        overlayInput.value = ""; // Clear the input field
        overlayDropdown.innerHTML = ''; // Clear dropdown
        overlayDropdown.style.display = 'none'; // Hide dropdown
        overlaySearchBtn.disabled = true; // Disable search button after click
        closeSearchOverlay();
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

    if (!storedLat || !storedLng || !storedTime || 
        (currentTime - storedTime > oneWeek) || 
        getDistanceFromLatLonInKm(storedLat, storedLng, localStorage.getItem('userLat'), localStorage.getItem('userLng')) > 2) {
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                const { latitude, longitude } = position.coords;
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

// GPS button geolocation handler
const handleGeolocation = function () {
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
};

if (nearMeBtn) {
    nearMeBtn.addEventListener('click', handleGeolocation);
}
if (overlayNearMeBtn) {
    overlayNearMeBtn.addEventListener('click', handleGeolocation);
}

}
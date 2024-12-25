// Slider Functionality

const slider = document.querySelector('.hero-slider');
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.querySelector('.slider-dots');
const dots = document.querySelectorAll('.dot');
const prevArrow = document.querySelector('.prev-arrow');
const nextArrow = document.querySelector('.next-arrow');

let currentIndex = 0;
const totalSlides = slides.length;
let slideInterval;
const intervalTime = 5000; // 5 seconds

// Function to go to a specific slide
function goToSlide(index) {
    // Ensure index is within bounds
    if (index < 0) {
        currentIndex = totalSlides - 1;
    } else if (index >= totalSlides) {
        currentIndex = 0;
    } else {
        currentIndex = index;
    }
    // Move the slider
    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    // Update active dot
    updateDots();
}

// Function to go to the next slide
function nextSlide() {
    goToSlide(currentIndex + 1);
}

// Function to go to the previous slide
function prevSlide() {
    goToSlide(currentIndex - 1);
}

// Function to update active dot
function updateDots() {
    dots.forEach(dot => dot.classList.remove('active'));
    dots[currentIndex].classList.add('active');
}

// Function to start the slider
function startSlider() {
    slideInterval = setInterval(nextSlide, intervalTime);
}

// Function to stop the slider
function stopSlider() {
    clearInterval(slideInterval);
}

// Event Listeners for Arrows
nextArrow.addEventListener('click', () => {
    nextSlide();
    stopSlider();
    startSlider();
});

prevArrow.addEventListener('click', () => {
    prevSlide();
    stopSlider();
    startSlider();
});

// Event Listeners for Dots
dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-slide'));
        goToSlide(index);
        stopSlider();
        startSlider();
    });
});

// Pause slider on hover
const heroSection = document.querySelector('.hero');
heroSection.addEventListener('mouseenter', stopSlider);
heroSection.addEventListener('mouseleave', startSlider);

// Initialize Slider
startSlider();

// Hamburger Menu Functionality
const navItems = document.querySelector('.nav-items');
const hamburger = document.querySelector('.hamburger');
const dropdown = document.querySelector('.dropdown');
const servicesButton = document.getElementById('services-button'); // Select the Services button

// Toggle navigation on hamburger click
hamburger.addEventListener('click', () => {
    navItems.classList.toggle('active');
});

// Toggle dropdown menu on Services button click
servicesButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default link behavior
    dropdown.classList.toggle('active'); // Toggle the 'active' class to show/hide the dropdown menu
});

// Profile Dropdown Functionality
const profileButton = document.getElementById('profile-button');
const profileDropdown = document.querySelector('.profile-dropdown');

// Toggle profile dropdown on profile button click
profileButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default link behavior
    profileDropdown.classList.toggle('active'); // Toggle the 'active' class to show/hide the profile dropdown menu
});

// Note: The dropdown will not close when clicking outside, as per requirements.

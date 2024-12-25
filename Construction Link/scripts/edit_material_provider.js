// edit_material_provider.js

document.addEventListener("DOMContentLoaded", function() {
  const editForm = document.getElementById('editForm');
  const companyLogoInput = document.getElementById('companyLogo');
  const previewImg = document.getElementById('previewImg');

  // Image Preview Functionality
  companyLogoInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
              previewImg.src = e.target.result;
          }
          reader.readAsDataURL(file);
      }
  });

  // Function to display error popup
  window.showErrorPopup = function(errors) {
      const popup = document.getElementById('errorPopup');
      const errorList = document.getElementById('errorList');
      const closeBtn = document.getElementById('closePopupBtn');

      // Clear any existing errors
      errorList.innerHTML = '';

      // Populate the errors
      errors.forEach(function(error) {
          const li = document.createElement('li');
          li.textContent = error;
          errorList.appendChild(li);
      });

      // Show the popup
      popup.style.display = 'block';

      // Close button handler
      closeBtn.onclick = function() {
          popup.style.display = 'none';
      };

      // Close the popup when clicking outside the popup content
      window.onclick = function(event) {
          if (event.target == popup) {
              popup.style.display = 'none';
          }
      };
  }

  // Function to display success popup
  window.showSuccessPopup = function(message) {
      const popup = document.getElementById('successPopup');
      const successMessage = document.getElementById('successMessage');
      const closeBtn = document.getElementById('closeSuccessPopupBtn');

      // Set the success message
      successMessage.textContent = message;

      // Show the popup
      popup.style.display = 'block';

      // Close button handler
      closeBtn.onclick = function() {
          popup.style.display = 'none';
      };

      // Close the popup when clicking outside the popup content
      window.onclick = function(event) {
          if (event.target == popup) {
              popup.style.display = 'none';
          }
      };
  }
});

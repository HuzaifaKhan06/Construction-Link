const openFormBtn = document.getElementById("openFormBtn");
const closeFormBtn = document.getElementById("closeFormBtn");
const registrationForm = document.getElementById("registrationForm");

const fileInput = document.getElementById("companyLogo");
const previewImg = document.getElementById("previewImg");

openFormBtn.addEventListener("click", () => {
  registrationForm.classList.add("active");
});

closeFormBtn.addEventListener("click", () => {
  registrationForm.classList.remove("active");
  // Optionally reset the image preview and file input
  previewImg.src = "";
  fileInput.value = "";
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.src = ""; 
  }
});

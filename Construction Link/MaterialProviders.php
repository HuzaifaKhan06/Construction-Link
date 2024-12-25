<?php
session_start();

// Check if the user is logged in
if (!isset($_SESSION['user_id']) || !isset($_SESSION['email'])) {
    // If not logged in, redirect to login page
    header("Location: login.php");
    exit;
}

// Database connection
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Fetch user information and material_provider_id
try {
    $stmt = $pdo->prepare("SELECT mp.id AS material_provider_id, mp.companyName, mp.companyLogo FROM material_providers mp JOIN users u ON mp.user_id = u.id WHERE u.email = :email ORDER BY mp.id DESC LIMIT 1");
    $stmt->bindParam(':email', $_SESSION['email']);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // If user details not found, redirect to registration
        header("Location: Materialregister.php");
        exit;
    }

    $materialProviderId = $user['material_provider_id'];
    $companyName = htmlspecialchars($user['companyName']);
    $companyLogo = htmlspecialchars($user['companyLogo']);
} catch (PDOException $e) {
    die("Error fetching user data: " . $e->getMessage());
}

// Fetch existing materials for this provider
try {
    $stmt = $pdo->prepare("SELECT * FROM materials WHERE material_provider_id = :provider_id ORDER BY id DESC");
    $stmt->bindParam(':provider_id', $materialProviderId, PDO::PARAM_INT);
    $stmt->execute();
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Error fetching materials: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Existing head content -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Material Provider Dashboard</title>
    <link rel="stylesheet" href="css/material_providers.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css">
    <style>
        /* Add this CSS to handle dropdown visibility */
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: #f9f9f9;
            min-width: 160px;
            /* Adjust as needed */
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }

        .dropdown-content.show {
            display: block;
        }

        .dropdown {
            position: relative;
            display: inline-block;
        }

        .dropdown-btn img {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
        }

        /* Optional: Style for caret icon */
        .dropdown-btn .fas.fa-caret-down {
            margin-left: 5px;
        }
    </style>
</head>

<body>
    <div class="dashboard-container">
        <!-- Navigation Bar -->
        <nav class="navbar">
            <div class="logo">Construction Link</div>
            <!-- Hamburger Menu for Mobile -->
            <div class="hamburger" id="hamburger">
                <i class="fas fa-bars"></i>
            </div>
            <ul class="nav-links" id="navLinks">
                <li><a href="#">Create Design</a></li>
                <li><a href="#" id="openModal">Upload Items</a></li>
                <li><a href="#">View Orders</a></li>
                <li><a href="#">Sales</a></li>
                <li class="dropdown">
                    <a href="javascript:void(0);" class="dropdown-btn" id="switchProfileBtn">
                        Switch Profile
                        <i class="fas fa-caret-down"></i>
                    </a>
                    <div class="dropdown-content no-close" id="switchProfileDropdown">
                        <a href="dashboard.php">Switch to Users</a>
                    </div>
                </li>
                <li class="dropdown">
                    <a href="javascript:void(0);" class="dropdown-btn profile-icon" id="profileIconBtn">
                        <?php if (!empty($companyLogo) && file_exists($companyLogo)): ?>
                            <img src="<?php echo $companyLogo; ?>" alt="<?php echo $companyName; ?> Logo">
                        <?php else: ?>
                            <i class="fas fa-user-circle"></i>
                        <?php endif; ?>
                        <i class="fas fa-caret-down"></i>
                    </a>
                    <div class="dropdown-content dropdown-content-2 no-close" id="profileIconDropdown">
                        <a href="edit_material_provider.php">Edit Profile</a>
                        <a href="Login.php">Logout</a>
                    </div>
                </li>
            </ul>
        </nav>

        <!-- Notification Area -->
        <div id="notification"></div>

        <!-- Dashboard Header -->
        <header class="dashboard-header">
            <h1>Material Provider Dashboard</h1>
            <p class="welcome-message">Welcome, <span><?php echo $companyName; ?></span></p>
        </header>

        <!-- Material Cards Section -->
        <section class="material-section" id="materialSection">
            <?php if ($materials): ?>
                <?php foreach ($materials as $material): ?>
                    <div class="material-card" data-id="<?php echo $material['id']; ?>">
                        <img src="<?php echo htmlspecialchars($material['image']); ?>" alt="<?php echo htmlspecialchars($material['materialName']); ?>" class="material-image">
                        <div class="material-info">
                            <p><strong>Name:</strong> <?php echo htmlspecialchars($material['materialName']); ?></p>
                            <p><strong>Price:</strong> $<?php echo number_format($material['price'], 2); ?></p>
                            <p><strong>Quantity:</strong> <?php echo htmlspecialchars($material['quantity']); ?></p>
                            <p><strong>Material Type:</strong> <?php echo htmlspecialchars($material['materialType']); ?></p>
                            <p><strong>Unit:</strong> <?php echo htmlspecialchars($material['unit']); ?></p>
                            <p><strong>Description:</strong> <?php echo htmlspecialchars($material['description']); ?></p>
                        </div>
                        <div class="action-buttons">
                            <button class="edit-button">Edit</button>
                            <button class="delete-button">Delete</button>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <p id="noMaterialsMessage">No materials uploaded yet.</p>
            <?php endif; ?>
        </section>

        <!-- Popup Modal for Uploading Items -->
        <div id="uploadModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Upload Material</h2>
                <form id="uploadForm" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="materialName">Material Name</label>
                        <select id="materialName" name="materialName" required>
                            <option value="">--None--</option>
                            <option value="Cement">Cement</option>
                            <option value="Steel">Steel</option>
                            <option value="Bricks">Bricks</option>
                            <option value="Wood">Wood</option>
                            <option value="Paint">Paint</option>
                        </select>
                        <div class="error-message" id="materialNameError"></div>
                    </div>

                    <div class="form-group">
                        <label for="price">Price ($)</label>
                        <input type="number" id="price" name="price" required min="0.01" step="0.01">
                        <div class="error-message" id="priceError"></div>
                    </div>

                    <div class="form-group">
                        <label for="quantity">Quantity</label>
                        <input type="number" id="quantity" name="quantity" required min="1">
                        <div class="error-message" id="quantityError"></div>
                    </div>

                    <div class="form-group">
                        <label for="materialType">Material Type</label>
                        <select id="materialType" name="materialType" required>
                            <option value="">--None--</option>
                            <option value="Concrete">Concrete</option>
                            <option value="Metals">Metals</option>
                            <option value="Aggregates">Aggregates</option>
                            <option value="Clay Products">Clay Products</option>
                            <option value="Timber">Timber</option>
                        </select>
                        <div class="error-message" id="materialTypeError"></div>
                    </div>

                    <div class="form-group">
                        <label for="unit">Unit of Measurement</label>
                        <select id="unit" name="unit" required>
                            <option value="">--None--</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="m">Meter (m)</option>
                            <option value="L">Liter (L)</option>
                            <option value="pieces">Pieces</option>
                            <option value="bags">Bags</option>
                        </select>
                        <div class="error-message" id="unitError"></div>
                    </div>

                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required></textarea>
                        <div class="error-message" id="descriptionError"></div>
                    </div>

                    <div class="form-group">
                        <label for="image">Image</label>
                        <input type="file" id="image" name="image" accept="image/*" required>
                        <div class="error-message" id="imageError"></div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="uploadBtn">Upload</button>
                        <button type="button" id="cancelBtn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>


        <!-- Popup Modal for Editing Material -->
        <div id="editModal" class="modal">
            <div class="modal-content">
                <span class="close-edit">&times;</span>
                <h2>Edit Material</h2>
                <form id="editForm" enctype="multipart/form-data">
                    <input type="hidden" id="editMaterialId" name="id">

                    <div class="form-group">
                        <label for="editMaterialName">Material Name</label>
                        <select id="editMaterialName" name="materialName" required>
                            <option value="">--None--</option>
                            <option value="Cement">Cement</option>
                            <option value="Steel">Steel</option>
                            <option value="Bricks">Bricks</option>
                            <option value="Wood">Wood</option>
                            <option value="Paint">Paint</option>
                        </select>
                        <div class="error-message" id="editMaterialNameError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editPrice">Price ($)</label>
                        <input type="number" id="editPrice" name="price" required min="0.01" step="0.01">
                        <div class="error-message" id="editPriceError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editQuantity">Quantity</label>
                        <input type="number" id="editQuantity" name="quantity" required min="1">
                        <div class="error-message" id="editQuantityError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editMaterialType">Material Type</label>
                        <select id="editMaterialType" name="materialType" required>
                            <option value="">--None--</option>
                            <option value="Concrete">Concrete</option>
                            <option value="Metals">Metals</option>
                            <option value="Aggregates">Aggregates</option>
                            <option value="Clay Products">Clay Products</option>
                            <option value="Timber">Timber</option>
                        </select>
                        <div class="error-message" id="editMaterialTypeError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editUnit">Unit of Measurement</label>
                        <select id="editUnit" name="unit" required>
                            <option value="">--None--</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="m">Meter (m)</option>
                            <option value="L">Liter (L)</option>
                            <option value="pieces">Pieces</option>
                            <option value="bags">Bags</option>
                        </select>
                        <div class="error-message" id="editUnitError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editDescription">Description</label>
                        <textarea id="editDescription" name="description" required></textarea>
                        <div class="error-message" id="editDescriptionError"></div>
                    </div>

                    <div class="form-group">
                        <label for="editImage">Image</label>
                        <input type="file" id="editImage" name="image" accept="image/*">
                        <div class="error-message" id="editImageError"></div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="saveChangesBtn">Save Changes</button>
                        <button type="button" id="cancelEditBtn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>


    </div>

    <!-- JavaScript for Modal, Dropdowns, and Notifications -->
    <script>
        // ===========================
        // JavaScript for Material Provider Dashboard
        // ===========================

        // ===========================
        // Notification Functionality
        // ===========================

        const notification = document.getElementById('notification');

        function showNotification(message, isError = false) {
            notification.innerText = message;
            if (isError) {
                notification.classList.add('error');
            } else {
                notification.classList.remove('error');
            }
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        // ===========================
        // Upload Modal Functionality
        // ===========================

        const modal = document.getElementById('uploadModal');
        const openModalBtn = document.getElementById('openModal');
        const closeBtn = document.querySelector('.modal .close');
        const cancelBtn = document.getElementById('cancelBtn');
        const uploadForm = document.getElementById('uploadForm');
        const noMaterialsMessage = document.getElementById('noMaterialsMessage');

        const openUploadModal = () => {
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        };

        const closeUploadModal = () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            uploadForm.reset();
            document.querySelectorAll('.error-message').forEach(function(msg) {
                msg.innerText = '';
            });
        };

        openModalBtn.addEventListener('click', openUploadModal);
        closeBtn.addEventListener('click', closeUploadModal);
        cancelBtn.addEventListener('click', closeUploadModal);

        uploadForm.addEventListener('submit', function(event) {
            event.preventDefault();
            document.querySelectorAll('.error-message').forEach(function(msg) {
                msg.innerText = '';
            });

            const formData = new FormData(uploadForm);

            fetch('upload_material.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        closeUploadModal();

                        if (noMaterialsMessage) {
                            noMaterialsMessage.style.display = 'none';
                        }

                        const materialCard = document.createElement('div');
                        materialCard.classList.add('material-card');
                        materialCard.setAttribute('data-id', data.material.id);

                        materialCard.innerHTML = `
                    <img src="${data.material.image}" alt="${data.material.materialName}" class="material-image">
                    <div class="material-info">
                        <p><strong>Name:</strong> ${data.material.materialName}</p>
                        <p><strong>Price:</strong> $${parseFloat(data.material.price).toFixed(2)}</p>
                        <p><strong>Quantity:</strong> ${data.material.quantity}</p>
                        <p><strong>Material Type:</strong> ${data.material.materialType}</p>
                        <p><strong>Unit:</strong> ${data.material.unit}</p>
                        <p><strong>Description:</strong> ${data.material.description}</p>
                    </div>
                    <div class="action-buttons">
                        <button class="edit-button">Edit</button>
                        <button class="delete-button">Delete</button>
                    </div>
                `;

                        document.getElementById('materialSection').prepend(materialCard);

                        // Attach event listener to the new delete button
                        materialCard.querySelector('.delete-button').addEventListener('click', handleDelete);

                        // No need to attach Edit listener here due to event delegation

                        showNotification('Material uploaded successfully!');
                    } else {
                        if (data.errors) {
                            for (const [field, message] of Object.entries(data.errors)) {
                                const errorElement = document.getElementById(`${field}Error`);
                                if (errorElement) {
                                    errorElement.innerText = message;
                                }
                            }
                        } else {
                            showNotification(data.message || 'An error occurred.', true);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('An unexpected error occurred.', true);
                });
        });

        // ===========================
        // Delete Functionality
        // ===========================

        function handleDelete(event) {
            const button = event.target;
            const materialCard = button.closest('.material-card');
            const materialId = materialCard.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this material?')) {
                fetch('delete_material.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: materialId
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            materialCard.remove();

                            if (document.querySelectorAll('.material-card').length === 0) {
                                if (noMaterialsMessage) {
                                    noMaterialsMessage.style.display = 'block';
                                }
                            }

                            showNotification('Data has been deleted successfully!');
                        } else {
                            showNotification(data.message || 'Failed to delete the material.', true);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showNotification('An unexpected error occurred.', true);
                    });
            }
        }

        // Attach delete event listeners to existing delete buttons
        document.querySelectorAll('.delete-button').forEach(function(button) {
            button.addEventListener('click', handleDelete);
        });

        // ===========================
        // Edit Modal Functionality with Event Delegation
        // ===========================

        const editModal = document.getElementById('editModal');
        const closeEditBtn = editModal.querySelector('.close-edit');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const editForm = document.getElementById('editForm');

        function openEditModal(materialCard) {
            const materialId = materialCard.getAttribute('data-id');
            const materialName = materialCard.querySelector('.material-info p:nth-child(1)').innerText.replace('Name: ', '');
            const price = materialCard.querySelector('.material-info p:nth-child(2)').innerText.replace('Price: $', '');
            const quantity = materialCard.querySelector('.material-info p:nth-child(3)').innerText.replace('Quantity: ', '');
            const materialType = materialCard.querySelector('.material-info p:nth-child(4)').innerText.replace('Material Type: ', '');
            const unit = materialCard.querySelector('.material-info p:nth-child(5)').innerText.replace('Unit: ', '');
            const description = materialCard.querySelector('.material-info p:nth-child(6)').innerText.replace('Description: ', '');

            document.getElementById('editMaterialId').value = materialId;
            document.getElementById('editMaterialName').value = materialName;
            document.getElementById('editPrice').value = parseFloat(price);
            document.getElementById('editQuantity').value = parseInt(quantity);
            document.getElementById('editMaterialType').value = materialType;
            document.getElementById('editUnit').value = unit;
            document.getElementById('editDescription').value = description;

            editModal.style.display = 'block';
            document.body.classList.add('modal-open');
        }

        function closeEditModal() {
            editModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            editForm.reset();
            document.querySelectorAll('#editForm .error-message').forEach(function(msg) {
                msg.innerText = '';
            });
        }

        closeEditBtn.addEventListener('click', closeEditModal);
        cancelEditBtn.addEventListener('click', closeEditModal);

        editForm.addEventListener('submit', function(event) {
            event.preventDefault();
            document.querySelectorAll('#editForm .error-message').forEach(function(msg) {
                msg.innerText = '';
            });

            const formData = new FormData(editForm);

            fetch('edit_material.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        closeEditModal();

                        const materialCard = document.querySelector(`.material-card[data-id="${data.material.id}"]`);

                        if (materialCard) {
                            materialCard.querySelector('.material-info p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${data.material.materialName}`;
                            materialCard.querySelector('.material-info p:nth-child(2)').innerHTML = `<strong>Price:</strong> $${parseFloat(data.material.price).toFixed(2)}`;
                            materialCard.querySelector('.material-info p:nth-child(3)').innerHTML = `<strong>Quantity:</strong> ${data.material.quantity}`;
                            materialCard.querySelector('.material-info p:nth-child(4)').innerHTML = `<strong>Material Type:</strong> ${data.material.materialType}`;
                            materialCard.querySelector('.material-info p:nth-child(5)').innerHTML = `<strong>Unit:</strong> ${data.material.unit}`;
                            materialCard.querySelector('.material-info p:nth-child(6)').innerHTML = `<strong>Description:</strong> ${data.material.description}`;

                            if (data.material.image) {
                                materialCard.querySelector('.material-image').setAttribute('src', data.material.image);
                            }

                            showNotification('Material updated successfully!');
                        }
                    } else {
                        if (data.errors) {
                            for (const [field, message] of Object.entries(data.errors)) {
                                const errorElement = document.getElementById(`edit${capitalizeFirstLetter(field)}Error`);
                                if (errorElement) {
                                    errorElement.innerText = message;
                                }
                            }
                        } else {
                            showNotification(data.message || 'An error occurred.', true);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('An unexpected error occurred.', true);
                });
        });

        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        // ===========================
        // Event Delegation for Edit Buttons
        // ===========================

        // Select the parent container that holds all material cards
        const materialSection = document.getElementById('materialSection');

        // Attach a single event listener to the parent container
        materialSection.addEventListener('click', function(event) {
            if (event.target && event.target.classList.contains('edit-button')) {
                const materialCard = event.target.closest('.material-card');
                openEditModal(materialCard);
            }
        });

        // ===========================
        // Dropdown Functionality
        // ===========================

        document.querySelectorAll('.dropdown-btn').forEach(function(dropdownBtn) {
            dropdownBtn.addEventListener('click', function(event) {
                event.preventDefault();
                const dropdownContent = this.nextElementSibling;
                dropdownContent.classList.toggle('show');
            });
        });

        window.addEventListener('click', function(event) {
            // Check if the click is not on a dropdown button or inside a dropdown
            if (!event.target.matches('.dropdown-btn') && !event.target.closest('.dropdown')) {
                // Iterate over all dropdown contents
                document.querySelectorAll('.dropdown-content').forEach(function(dropdown) {
                    // If the dropdown is open and does NOT have the 'no-close' class, close it
                    if (dropdown.classList.contains('show') && !dropdown.classList.contains('no-close')) {
                        dropdown.classList.remove('show');
                    }
                });
            }
        });

        // ===========================
        // Responsive Navbar Toggle
        // ===========================

        const navLinks = document.getElementById('navLinks');
        const hamburger = document.getElementById('hamburger');

        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });

        document.querySelectorAll('.nav-links a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (navLinks.classList.contains('show')) {
                    navLinks.classList.remove('show');
                }
            });
        });
    </script>


</body>

</html>

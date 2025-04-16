<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php?loginModal=open");
    exit;
}
$user_id = $_SESSION['user_id'];

// Connect to the database
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Fetch cart items for this user
$stmt = $pdo->prepare("SELECT * FROM cart_items WHERE user_id = ?");
$stmt->execute([$user_id]);
$cart_items = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Calculate order subtotal (but we will use dynamic summary so initial subtotal is 0)
$subtotal = 0;
foreach ($cart_items as $item) {
    $subtotal += $item['price'] * $item['quantity'];
}
$shipping_fee = 50; // Example fixed shipping fee
$order_total = $subtotal + $shipping_fee; // This is for reference only; our dynamic summary starts at 0

// Get cart count for header badge
$stmtCart = $pdo->prepare("SELECT COUNT(*) FROM cart_items WHERE user_id = ?");
$stmtCart->execute([$user_id]);
$cart_count = $stmtCart->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Cart - ConstructionLink</title>
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
  <!-- Google Fonts -->
  <link rel="stylesheet" href="css/add_to_cart.css">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
  <!-- Font Awesome and Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
  <!-- Custom CSS -->
  <style>
    /* Additional styling for the select checkbox column */
    .cart-table th.select-col, .cart-table td.select-col {
      width: 50px;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Navigation Bar -->
  <nav class="navbar">
    <div class="logo">
      <a href="#">ConstructionLink</a>
    </div>
    <ul class="nav-items">
      <li><a href="index.php">Home</a></li>
      <li><a href="#">Services</a></li>
      <li class="dropdown position-relative">
        <a href="#" id="services-button">Our Projects <i class="fas fa-chevron-down"></i></a>
        <ul class="dropdown-menu">
          <!-- Future project links -->
          <li><a href="#">Project A</a></li>
          <li><a href="#">Project B</a></li>
        </ul>
      </li>
      <li><a href="#">Our Clients</a></li>
      <!-- Profile Dropdown -->
      <li class="position-relative">
        <a href="stock_manage.php" id="profile-button" class="text-white"><i class="fa fa-user"></i></a>
        <ul class="profile-menu">
          <li><a href="stock_manage.php" class="dropdown-item">Dashboard</a></li>
          <li><a href="logout.php" class="dropdown-item">Logout</a></li>
        </ul>
      </li>
      <!-- Shopping Cart Icon -->
      <li class="cart position-relative">
        <a href="add_to_cart.php" id="cart-button" class="text-white position-relative">
          <i class="fa fa-shopping-cart"></i>
          <?php if ($cart_count > 0): ?>
            <span id="cart-badge" class="cart-badge"><?php echo $cart_count; ?></span>
          <?php endif; ?>
        </a>
      </li>
    </ul>
  </nav>

  <!-- Cart Section -->
  <section class="cart-section container">
    <h2>Your Cart</h2>
    <?php if (!empty($cart_items)): ?>
      <div class="table-responsive">
        <table class="cart-table table table-hover">
          <thead>
            <tr>
              <th class="select-col">Select</th>
              <th>Items</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
              <th>Remove</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($cart_items as $item):
              $item_subtotal = $item['price'] * $item['quantity'];
            ?>
              <tr data-item-id="<?php echo $item['id']; ?>">
                <!-- Checkbox column -->
                <td class="select-col">
                  <input type="checkbox" class="select-item" value="<?php echo $item['id']; ?>"
                         data-price="<?php echo $item['price']; ?>" data-quantity="<?php echo $item['quantity']; ?>">
                </td>
                <td class="d-flex align-items-center justify-content-center">
                  <img src="<?php echo htmlspecialchars($item['product_image']); ?>" alt="<?php echo htmlspecialchars($item['product_name']); ?>" class="cart-item-img">
                  <span><?php echo htmlspecialchars($item['product_name']); ?></span>
                </td>
                <td>PKR <?php echo number_format($item['price'], 2); ?></td>
                <td class="quantity-controls">
                  <button class="decrease-qty">-</button>
                  <span class="item-quantity"><?php echo $item['quantity']; ?></span>
                  <button class="increase-qty">+</button>
                </td>
                <td class="item-subtotal">PKR <?php echo number_format($item_subtotal, 2); ?></td>
                <td><button class="remove-item"><i class="fa fa-trash"></i></button></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <div class="row mt-4">
        <div class="col-md-8 text-start">
          <button id="continue-shopping" class="btn btn-secondary">Continue Shopping</button>
          <button id="clear-cart" class="btn btn-danger">Clear Cart</button>
        </div>
        <div class="col-md-4">
          <div class="order-summary">
            <h3>Order Summary</h3>
            <div>
              <span>Selected Items:</span>
              <span id="selected-count">0</span>
            </div>
            <div>
              <span>Subtotal:</span>
              <span id="summary-subtotal">PKR 0.00</span>
            </div>
            <div>
              <span>Shipping Fee:</span>
              <span id="summary-shipping">PKR <?php echo number_format($shipping_fee, 2); ?></span>
            </div>
            <div>
              <strong>Order Total:</strong>
              <strong id="summary-total">PKR <?php echo number_format($shipping_fee, 2); ?></strong>
            </div>
            <button id="checkout">Proceed to Checkout</button>
          </div>
        </div>
      </div>
    <?php else: ?>
      <p class="text-center">Your cart is empty.</p>
    <?php endif; ?>
  </section>

  <!-- SweetAlert2 for beautiful alerts -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <!-- Bootstrap JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Custom JS for Interactive Actions -->
  <script>
    // Dropdown functionality (same as before)
    document.getElementById('services-button').addEventListener('click', function(e) {
      e.preventDefault();
      var dropdown = this.nextElementSibling;
      dropdown.style.display = (dropdown.style.display === 'none' || dropdown.style.display === '') ? 'block' : 'none';
    });
    document.getElementById('profile-button').addEventListener('click', function(e) {
      e.preventDefault();
      var dropdown = this.nextElementSibling;
      dropdown.style.display = (dropdown.style.display === 'none' || dropdown.style.display === '') ? 'block' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(function(menu) {
          menu.style.display = 'none';
        });
      }
      if (!e.target.closest('#profile-button')) {
        document.querySelectorAll('.profile-menu').forEach(function(menu) {
          menu.style.display = 'none';
        });
      }
    });

    // Function to update order summary based on selected items
    function updateOrderSummary() {
      let selectedItems = document.querySelectorAll('.select-item:checked');
      let subtotal = 0;
      let count = 0;
      selectedItems.forEach(function(checkbox) {
        let price = parseFloat(checkbox.getAttribute('data-price'));
        let quantity = parseInt(checkbox.getAttribute('data-quantity'));
        subtotal += price * quantity;
        count++;
      });
      document.getElementById('selected-count').textContent = count;
      document.getElementById('summary-subtotal').textContent = 'PKR ' + subtotal.toFixed(2);
      let total = subtotal + <?php echo $shipping_fee; ?>;
      document.getElementById('summary-total').textContent = 'PKR ' + total.toFixed(2);
    }

    // Update summary on checkbox change
    document.querySelectorAll('.select-item').forEach(function(checkbox) {
      checkbox.addEventListener('change', updateOrderSummary);
    });

    // Also update summary when quantity changes if the item is selected.
    // Here we assume that when increasing or decreasing quantity, the updated quantity is set
    // in the DOM and also update the data-quantity attribute accordingly.
    function updateQuantityAndSummary(row, newQuantity) {
      let checkbox = row.querySelector('.select-item');
      if (checkbox) {
        checkbox.setAttribute('data-quantity', newQuantity);
      }
      // Also update the item subtotal displayed in the row
      let price = parseFloat(checkbox.getAttribute('data-price'));
      let itemSubtotalElem = row.querySelector('.item-subtotal');
      itemSubtotalElem.textContent = 'PKR ' + (price * newQuantity).toFixed(2);
      updateOrderSummary();
    }

    // Dynamic Cart Actions
    document.addEventListener('DOMContentLoaded', function() {
      // Increase quantity
      document.querySelectorAll('.increase-qty').forEach(function(button) {
        button.addEventListener('click', function() {
          var row = this.closest('tr');
          var itemId = row.getAttribute('data-item-id');
          fetch('update_cart_item.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: 'item_id=' + encodeURIComponent(itemId) + '&action=increase'
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                // update quantity display
                row.querySelector('.item-quantity').textContent = data.new_quantity;
                updateQuantityAndSummary(row, data.new_quantity);
                var cartBadge = document.getElementById('cart-badge');
                if (cartBadge) {
                  cartBadge.textContent = data.cart_count;
                }
                row.classList.add('animate-update');
                setTimeout(() => {
                  row.classList.remove('animate-update');
                }, 300);
              }
            });
        });
      });

      // Decrease quantity
      document.querySelectorAll('.decrease-qty').forEach(function(button) {
        button.addEventListener('click', function() {
          var row = this.closest('tr');
          var itemId = row.getAttribute('data-item-id');
          fetch('update_cart_item.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: 'item_id=' + encodeURIComponent(itemId) + '&action=decrease'
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                if (data.new_quantity > 0) {
                  row.querySelector('.item-quantity').textContent = data.new_quantity;
                  updateQuantityAndSummary(row, data.new_quantity);
                } else {
                  row.remove();
                }
                var cartBadge = document.getElementById('cart-badge');
                if (cartBadge) {
                  cartBadge.textContent = data.cart_count;
                }
                row.classList.add('animate-update');
                setTimeout(() => {
                  row.classList.remove('animate-update');
                }, 300);
              }
            });
        });
      });

      // Remove item
      document.querySelectorAll('.remove-item').forEach(function(button) {
        button.addEventListener('click', function() {
          var row = this.closest('tr');
          var itemId = row.getAttribute('data-item-id');
          fetch('remove_cart_item.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: 'item_id=' + encodeURIComponent(itemId)
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                row.classList.add('animate-remove');
                setTimeout(() => {
                  row.remove();
                  updateOrderSummary();
                  var cartBadge = document.getElementById('cart-badge');
                  if (cartBadge) {
                    cartBadge.textContent = data.cart_count;
                  }
                }, 300);
              }
            });
        });
      });

      // Clear Cart with confirmation
      document.getElementById('clear-cart') && document.getElementById('clear-cart').addEventListener('click', function() {
        Swal.fire({
          title: 'Are you sure?',
          text: "Your cart will be cleared!",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
          if (result.isConfirmed) {
            fetch('clear_cart.php', {
                method: 'POST'
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  document.querySelectorAll('.cart-table tbody tr').forEach(function(row) {
                    row.remove();
                  });
                  document.getElementById('summary-subtotal').textContent = 'PKR 0.00';
                  document.getElementById('summary-total').textContent = 'PKR ' + (<?php echo $shipping_fee; ?>).toFixed(2);
                  var cartBadge = document.getElementById('cart-badge');
                  if (cartBadge) {
                    cartBadge.remove();
                  }
                  Swal.fire('Cleared!', 'Your cart has been cleared.', 'success');
                }
              });
          }
        });
      });

      // Continue Shopping
      document.getElementById('continue-shopping') && document.getElementById('continue-shopping').addEventListener('click', function() {
        window.location.href = 'index.php';
      });

      // Checkout button: Only selected items will be sent to delivery page
      document.getElementById('checkout') && document.getElementById('checkout').addEventListener('click', function() {
        let selected = [];
        document.querySelectorAll('.select-item:checked').forEach(function(checkbox) {
          selected.push(checkbox.value);
        });
        if (selected.length === 0) {
          Swal.fire('No Items Selected', 'Please select at least one item to proceed to checkout.', 'warning');
          return;
        }
        // Redirect to delivery page with selected item IDs as a GET parameter
        window.location.href = 'delievery_info.php?source=cart&selected=' + encodeURIComponent(selected.join(','));
      });
    });
  </script>
</body>
</html>

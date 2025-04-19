<?php
session_start();
if (!isset($_SESSION['user_id']) || !isset($_SESSION['email'])) {
    header("Location: login.php");
    exit;
}
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
$stmt = $pdo->prepare("SELECT mp.id AS material_provider_id, mp.companyName FROM material_providers mp 
                       JOIN users u ON mp.user_id = u.id 
                       WHERE u.email = :email 
                       ORDER BY mp.id DESC LIMIT 1");
$stmt->bindParam(':email', $_SESSION['email']);
$stmt->execute();
$provider = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$provider) {
    die("Provider not found.");
}
$providerId = $provider['material_provider_id'];
$stmtOrders = $pdo->prepare("SELECT * FROM orders WHERE service_provider_id = :provider_id ORDER BY created_at DESC");
$stmtOrders->bindParam(':provider_id', $providerId, PDO::PARAM_INT);
$stmtOrders->execute();
$orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);
$currentOrderId = $_SESSION['order_id'] ?? null;
$currentOrder = null;
if ($currentOrderId) {
    $stmtOrderTime = $pdo->prepare("SELECT created_at, order_status FROM orders WHERE id = ?");
    $stmtOrderTime->execute([$currentOrderId]);
    $currentOrder = $stmtOrderTime->fetch(PDO::FETCH_ASSOC);
    if (!$currentOrder || $currentOrder['order_status'] !== 'pending') {
        unset($_SESSION['order_id']);
        $currentOrderId = null;
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>View Orders - ConstructionLink</title>
    <link rel="stylesheet" href="css/view_orders.css">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
</head>

<body>
    <nav class="navbar">
        <div class="logo">Construction Link</div>
        <ul class="nav-links">
            <li><a href="MaterialProviders.php"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="MaterialProviders.php"><i class="fas fa-pencil-alt"></i> Create Design</a></li>
            <li><a href="view_orders.php"><i class="fas fa-shopping-cart"></i> View Orders</a></li>
        </ul>
    </nav>
    <div class="container order-list">
        <h2>Your Orders</h2>
        <?php if ($orders): ?>
            <?php foreach ($orders as $order): ?>
                <div class="order-item" id="order-<?php echo htmlspecialchars($order['id']); ?>">
                    <div class="order-header">
                        <span><strong>Order ID:</strong> <?php echo htmlspecialchars($order['id']); ?></span>
                        <span class="order-status">
                            <strong>Status:</strong> <?php echo htmlspecialchars(ucfirst($order['order_status'])); ?>
                        </span>
                    </div>
                    <p><strong>Total Amount:</strong> PKR <?php echo number_format($order['order_total'], 2); ?></p>
                    <p><strong>Order Date:</strong> <?php echo htmlspecialchars($order['created_at']); ?></p>

                    <?php
                    $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = :order_id");
                    $stmtItems->bindParam(':order_id', $order['id'], PDO::PARAM_INT);
                    $stmtItems->execute();
                    $orderItems = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
                    if ($orderItems):
                    ?>
                        <div class="order-details">
                            <ul>
                                <?php foreach ($orderItems as $item): ?>
                                    <li>
                                        <?php echo htmlspecialchars($item['product_name']); ?> x <?php echo $item['quantity']; ?>
                                        = PKR <?php echo number_format($item['subtotal'], 2); ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>

                    <?php
                    $stmtDelivery = $pdo->prepare("SELECT * FROM delivery_info WHERE order_id = :order_id");
                    $stmtDelivery->bindParam(':order_id', $order['id'], PDO::PARAM_INT);
                    $stmtDelivery->execute();
                    $delivery = $stmtDelivery->fetch(PDO::FETCH_ASSOC);
                    if ($delivery):
                    ?>
                        <div class="delivery-info">
                            <h4>Delivery Information</h4>
                            <p><strong>Name:</strong> <?php echo htmlspecialchars($delivery['fullname']); ?></p>
                            <p><strong>Phone:</strong> <?php echo htmlspecialchars($delivery['phone']); ?></p>
                            <p><strong>Address:</strong> <?php echo htmlspecialchars($delivery['house_no'] . ", " . $delivery['colony'] . ", " . $delivery['city'] . ", " . $delivery['province']); ?></p>
                            <p><strong>Additional Details:</strong> <?php echo htmlspecialchars($delivery['address']); ?></p>
                        </div>
                    <?php endif; ?>

                    <!-- Time Storage Section Added Here -->
                    <?php
                    $label = 'order_' . $order['id'];
                    $stmtTime = $pdo->prepare("
                        SELECT id, first_timer, second_timer, message
                          FROM time_storage
                         WHERE label   = :label
                           AND user_id = :uid
                         LIMIT 1
                    ");
                    $stmtTime->execute([
                        ':label' => $label,
                        ':uid'   => $_SESSION['user_id']
                    ]);
                    $ts = $stmtTime->fetch(PDO::FETCH_ASSOC);
                    if ($ts):
                    ?>
                        <div class="time-storage">
                            <p><strong>Provider Acceptance Time:</strong>
                                <?php echo htmlspecialchars($ts['first_timer']); ?></p>
                            <p><strong>Provider Delivery Time:</strong>
                                <?php echo htmlspecialchars($ts['second_timer']); ?></p>
                            <p><?php echo htmlspecialchars($ts['message']); ?></p>
                        </div>
                    <?php endif; ?>

                    <?php if ($order['order_status'] === 'pending'): ?>
                        <div class="order-timer" id="timer-<?php echo htmlspecialchars($order['id']); ?>" data-created-at="<?php echo htmlspecialchars($order['created_at']); ?>">
                            Time Remaining: <span class="timer-text">10:00:00</span>
                        </div>
                    <?php endif; ?>

                    <?php if ($order['order_status'] === 'confirmed'): ?>
                        <div class="delivery-timer-container">
                            Delivery Timer: <span class="delivery-timer" id="delivery-timer-<?php echo htmlspecialchars($order['id']); ?>">10:00:00</span>
                        </div>
                        <div class="customer-response-message" id="response-message-<?php echo htmlspecialchars($order['id']); ?>">
                            Wait for the customer's response
                        </div>
                        <div class="delivery-action-buttons" id="delivery-actions-<?php echo htmlspecialchars($order['id']); ?>" style="display:none;">
                            <button class="delivery-time-btn" data-order-id="<?php echo $order['id']; ?>">Delivery Time</button>
                        </div>
                    <?php endif; ?>

                    <div class="action-buttons">
                        <?php if ($order['order_status'] === 'pending'): ?>
                            <button class="accept-order-btn" data-order-id="<?php echo $order['id']; ?>"><i class="fas fa-check"></i> Accept Order</button>
                            <button class="reject-order-btn" data-order-id="<?php echo $order['id']; ?>"><i class="fas fa-times"></i> Reject Order</button>
                        <?php elseif ($order['order_status'] === 'inactivity_cancelation'): ?>
                            <button class="clear-order-btn" data-order-id="<?php echo $order['id']; ?>"><i class="fas fa-trash-alt"></i> Clear Order</button>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <p style="text-align:center;">No orders available at the moment.</p>
        <?php endif; ?>
    </div>

    <div id="deliveryTimeModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" id="closeDeliveryModal">&times;</span>
            <h3>Enter Delivery Time & Message</h3>
            <form id="deliveryTimeForm">
                <div class="form-group">
                    <label for="delivery_time">Delivery Time (e.g., 14:30)</label>
                    <input type="date" id="delivery_time" name="delivery_time" required>
                </div>
                <div class="form-group">
                    <label for="delivery_message">Delivery Message</label>
                    <textarea id="delivery_message" name="delivery_message" rows="3" required></textarea>
                </div>
                <input type="hidden" id="order_id_input" name="order_id" value="">
                <button type="submit" class="btn-submit">Send Time</button>
            </form>
        </div>
    </div>

    <script>
        // Only one timer map now—no more deliveryTimers
        var orderTimers = {};

        // Utility to generate the same key used in initTimers()
        function orderElId(orderId) {
            return 'order_' + orderId;
        }

        // ––––––––––––––––––––––––
        // helper to store timers
        // ––––––––––––––––––––––––
        function sendTimer(type, orderId, stoppedTime, message = '') {
            const params = new URLSearchParams({
                timer_type: type,
                order_id: orderId,
                stopped_time: stoppedTime,
                message: message
            });
            fetch('store_time.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            }).catch(console.error);
        }

        // Starts the 10‑minute countdown for a given order from “now”
        function startIndividualTimer(orderId) {
            var timerEl = document.getElementById('timer-' + orderId);
            if (!timerEl) return;
            var textEl = timerEl.querySelector('.timer-text');
            var durationMs = 10 * 60 * 1000; // 10 minutes
            var endTime = Date.now() + durationMs;

            // Clear any existing interval
            var key = orderElId(orderId);
            if (orderTimers[key]) {
                clearInterval(orderTimers[key]);
            }

            orderTimers[key] = setInterval(function update() {
                var now = Date.now();
                var remaining = endTime - now;
                if (remaining <= 0) {
                    clearInterval(orderTimers[key]);
                    textEl.textContent = "00:00:00";
                    cancelOrder(orderId);
                    return;
                }
                var minutes = Math.floor(remaining / 60000);
                var seconds = Math.floor((remaining % 60000) / 1000);
                var hundredths = Math.floor((remaining % 1000) / 10);
                textEl.textContent =
                    (minutes < 10 ? "0" + minutes : minutes) + ":" +
                    (seconds < 10 ? "0" + seconds : seconds) + ":" +
                    (hundredths < 10 ? "0" + hundredths : hundredths);
            }, 10);
        }

        // On initial page load, hook up every existing .order-timer
        function initTimers() {
            document.querySelectorAll('.order-timer').forEach(function(timerEl) {
                var orderId = timerEl.id.split('-')[1];
                var createdAt = timerEl.getAttribute('data-created-at');
                var startTime = new Date(createdAt).getTime();
                var durationMs = 10 * 60 * 1000;
                var endTime = startTime + durationMs;
                var textEl = timerEl.querySelector('.timer-text');
                var key = orderElId(orderId);

                // Clear if somehow already exists
                if (orderTimers[key]) clearInterval(orderTimers[key]);

                orderTimers[key] = setInterval(function update() {
                    var now = Date.now();
                    var remaining = endTime - now;
                    if (remaining <= 0) {
                        clearInterval(orderTimers[key]);
                        textEl.textContent = "00:00:00";
                        cancelOrder(orderId);
                        return;
                    }
                    var minutes = Math.floor(remaining / 60000);
                    var seconds = Math.floor((remaining % 60000) / 1000);
                    var hundredths = Math.floor((remaining % 1000) / 10);
                    textEl.textContent =
                        (minutes < 10 ? "0" + minutes : minutes) + ":" +
                        (seconds < 10 ? "0" + seconds : seconds) + ":" +
                        (hundredths < 10 ? "0" + hundredths : hundredths);
                }, 10);
            });
        }

        // Cancels an order due to inactivity
        function cancelOrder(orderId) {
            var params = 'order_id=' + encodeURIComponent(orderId) +
                '&new_status=' + encodeURIComponent('inactivity_cancelation');
            fetch('update_order_status.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        var item = document.getElementById('order-' + orderId);
                        if (!item) return;
                        item.querySelector('.order-status').textContent = 'Inactivity_cancelation';
                        var actions = item.querySelector('.action-buttons');
                        actions.innerHTML =
                            '<button class="clear-order-btn" data-order-id="' + orderId + '">' +
                            '<i class="fas fa-trash-alt"></i> Clear Order</button>';
                        addClearOrderListener();
                    }
                })
                .catch(console.error);
        }

        // Accept‑order handler: stop timer, record first stop, wait 1s, restart it & show “wait for customer response”
        document.querySelectorAll('.accept-order-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var orderId = this.getAttribute('data-order-id');
                var body = 'order_id=' + encodeURIComponent(orderId) +
                    '&new_status=' + encodeURIComponent('confirmed');
                fetch('update_order_status.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: body
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (!data.success) {
                            return alert('Failed to update order status.');
                        }
                        var item = document.getElementById('order-' + orderId);
                        if (!item) return;
                        // Update status & clear action buttons
                        item.querySelector('.order-status').textContent = 'Confirmed';
                        item.querySelector('.action-buttons').innerHTML = '';

                        // Stop the current countdown
                        var key = orderElId(orderId);
                        if (orderTimers[key]) {
                            clearInterval(orderTimers[key]);
                        }

                        // — capture the exact timer text instead of ISO timestamp —
                        const timerTextEl = document.querySelector("#timer-" + orderId + " .timer-text");
                        const stoppedTimeText = timerTextEl ? timerTextEl.textContent : "00:00:00";
                        sendTimer('first', orderId, stoppedTimeText);

                        // Ensure response‑message exists
                        var msgEl = document.getElementById('response-message-' + orderId);
                        if (!msgEl) {
                            msgEl = document.createElement('div');
                            msgEl.className = 'customer-response-message';
                            msgEl.id = 'response-message-' + orderId;
                            item.appendChild(msgEl);
                        }
                        msgEl.textContent = 'Wait for customer response';
                        msgEl.style.display = 'block';

                        // Ensure delivery button container exists (hidden until customer confirms)
                        var actions = document.getElementById('delivery-actions-' + orderId);
                        if (!actions) {
                            actions = document.createElement('div');
                            actions.id = 'delivery-actions-' + orderId;
                            actions.className = 'delivery-action-buttons';
                            actions.style.display = 'none';
                            actions.innerHTML = '<button class="delivery-time-btn" data-order-id="' + orderId + '">Delivery Time</button>';
                            item.appendChild(actions);
                        }

                        // After a 1‑second pause, restart a fresh 10‑minute countdown
                        setTimeout(function() {
                            startIndividualTimer(orderId);
                        }, 1000);
                    })
                    .catch(console.error);
            });
        });

        // Reject‑order stays the same (simply clear its timer)
        document.querySelectorAll('.reject-order-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var orderId = this.getAttribute('data-order-id');
                var body = 'order_id=' + encodeURIComponent(orderId) +
                    '&new_status=' + encodeURIComponent('order rejected');
                fetch('update_order_status.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: body
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            var item = document.getElementById('order-' + orderId);
                            if (item) {
                                item.querySelector('.order-status').textContent = 'Order Rejected';
                                item.querySelector('.action-buttons').innerHTML = '';
                            }
                            var key = orderElId(orderId);
                            if (orderTimers[key]) clearInterval(orderTimers[key]);
                        }
                    })
                    .catch(console.error);
            });
        });

        // Clear order listener (unchanged)
        function addClearOrderListener() {
            document.querySelectorAll('.clear-order-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var orderId = this.getAttribute('data-order-id');
                    fetch('clear_order.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: 'order_id=' + encodeURIComponent(orderId)
                        })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                var item = document.getElementById('order-' + orderId);
                                if (item) item.remove();
                            } else {
                                alert('Failed to clear order.');
                            }
                        })
                        .catch(console.error);
                });
            });
        }
        addClearOrderListener();

        // Initialize all countdowns on page load
        initTimers();

        // Poll for customer confirm/cancel (unchanged)
        function pollOrderStatuses() {
            document.querySelectorAll('.order-item').forEach(function(item) {
                var orderId = item.id.split('-')[1];
                fetch('get_order_status.php?order_id=' + encodeURIComponent(orderId))
                    .then(res => res.json())
                    .then(data => {
                        var resp = document.getElementById('response-message-' + orderId);
                        var actions = document.getElementById('delivery-actions-' + orderId);

                        if (data.status === "customer canceled" && resp) {
                            const responseMessage = "Customer has canceled the order";
                            resp.textContent = responseMessage;
                            resp.style.display = "block";
                            if (actions) actions.style.display = "none";

                            // NEW CODE: Stop the timer immediately
                            var key = orderElId(orderId);
                            if (orderTimers[key]) {
                                clearInterval(orderTimers[key]);
                                orderTimers[key] = null;
                            }

                            // Save the customer response to database
                            sendTimer('customer_response', orderId, '', responseMessage);

                        } else if (data.status === "customer confirmed" && resp) {
                            const responseMessage = "Customer has confirmed the order";
                            resp.textContent = responseMessage;
                            resp.style.display = "block";
                            if (actions) actions.style.display = "block";

                            // Save the customer response to database
                            sendTimer('customer_response', orderId, '', responseMessage);
                        }
                    })
                    .catch(console.error);
            });
        }
        setInterval(pollOrderStatuses, 2000);

        function sendTimer(type, orderId, stoppedTime, message = '') {
            const params = new URLSearchParams({
                timer_type: type,
                order_id: orderId,
                stopped_time: stoppedTime,
                message: message
            });
            fetch('store_time.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            }).catch(console.error);
        }

        // Delivery‐time modal logic (unchanged)
        var deliveryTimeModal = document.getElementById("deliveryTimeModal");
        var closeDeliveryModal = document.getElementById("closeDeliveryModal");
        document.addEventListener("click", function(e) {
            if (e.target.classList.contains("delivery-time-btn")) {
                var id = e.target.getAttribute("data-order-id");
                document.getElementById("order_id_input").value = id;
                deliveryTimeModal.style.display = "block";
            }
        });
        closeDeliveryModal.addEventListener("click", function() {
            deliveryTimeModal.style.display = "none";
        });
        document.getElementById("deliveryTimeForm").addEventListener("submit", function(e) {
            e.preventDefault();
            fetch('save_delivery_details.php', {
                    method: 'POST',
                    body: new FormData(this)
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert("Delivery details saved successfully.");
                        deliveryTimeModal.style.display = "none";

                        // Stop the timer and preserve current text
                        var orderId = document.getElementById("order_id_input").value;
                        var key = orderElId(orderId);

                        // — capture the exact timer text instead of ISO timestamp —
                        const timerTextEl = document.querySelector("#timer-" + orderId + " .timer-text");
                        const stoppedTimeText = timerTextEl ? timerTextEl.textContent : "00:00:00";
                        const deliveryMsg = document.getElementById("delivery_message").value;

                        // Stop the timer
                        if (orderTimers[key]) {
                            clearInterval(orderTimers[key]);
                            orderTimers[key] = null;
                        }

                        // Send the timer text to the backend
                        sendTimer('second', orderId, stoppedTimeText, deliveryMsg);

                        // Timer display remains unchanged (shows time left at stop)
                        if (timerTextEl) {
                            timerTextEl.style.color = "green"; // Optional: show it's final
                        }
                    } else {
                        alert("Error: " + data.error);
                    }
                })
                .catch(console.error);
        });
    </script>

</body>

</html>
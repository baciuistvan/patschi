<?php
/**
 * Plugin Name: Gift Card Purchase Widget
 * Description: Allow customers to purchase gift cards on your WordPress site
 * Version: 1.0.0
 * Author: Your Company
 */

if (!defined('ABSPATH')) {
    exit;
}

function gift_card_widget_shortcode($atts) {
    $attributes = shortcode_atts(array(
        'supabase_url' => '',
        'supabase_anon_key' => '',
    ), $atts);

    $supabase_url = !empty($attributes['supabase_url']) ? esc_attr($attributes['supabase_url']) : '';
    $supabase_anon_key = !empty($attributes['supabase_anon_key']) ? esc_attr($attributes['supabase_anon_key']) : '';

    if (empty($supabase_url) || empty($supabase_anon_key)) {
        return '<p style="color: red; padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 8px;">
            <strong>Configuration Error:</strong> Please configure Supabase credentials in the shortcode.<br>
            Example: [gift_card_widget supabase_url="YOUR_URL" supabase_anon_key="YOUR_KEY"]
        </p>';
    }

    ob_start();
    ?>
    <div id="gift-card-widget-root"></div>

    <script>
        window.GIFT_CARD_CONFIG = {
            supabaseUrl: '<?php echo $supabase_url; ?>',
            supabaseAnonKey: '<?php echo $supabase_anon_key; ?>'
        };
    </script>

    <style>
        #gift-card-widget-root {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .gc-widget {
            max-width: 800px;
            margin: 40px auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            padding: 40px;
        }
        .gc-header {
            text-align: center;
            margin-bottom: 40px;
        }
        .gc-header h2 {
            font-size: 32px;
            font-weight: bold;
            color: #1e293b;
            margin: 0 0 10px 0;
        }
        .gc-header p {
            color: #64748b;
            font-size: 16px;
            margin: 0;
        }
        .gc-amounts {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .gc-amount-btn {
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            color: #334155;
        }
        .gc-amount-btn:hover {
            border-color: #10b981;
            background: #f0fdf4;
        }
        .gc-amount-btn.active {
            border-color: #10b981;
            background: #ecfdf5;
            color: #059669;
        }
        .gc-form-group {
            margin-bottom: 25px;
        }
        .gc-form-group label {
            display: block;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .gc-form-group input,
        .gc-form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s;
            box-sizing: border-box;
        }
        .gc-form-group input:focus,
        .gc-form-group textarea:focus {
            outline: none;
            border-color: #10b981;
            background: #f0fdf4;
        }
        .gc-form-group textarea {
            resize: vertical;
            min-height: 100px;
            font-family: inherit;
        }
        .gc-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        .gc-section {
            border-top: 2px solid #e2e8f0;
            padding-top: 30px;
            margin-top: 30px;
        }
        .gc-section h3 {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin: 0 0 20px 0;
        }
        .gc-total {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
        }
        .gc-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .gc-total-label {
            font-weight: 600;
            color: #475569;
        }
        .gc-total-amount {
            font-size: 32px;
            font-weight: bold;
            color: #1e293b;
        }
        .gc-total-note {
            font-size: 12px;
            color: #64748b;
            margin: 0;
        }
        .gc-submit-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .gc-submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        }
        .gc-submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .gc-error {
            background: #fee;
            border: 2px solid #fcc;
            border-radius: 8px;
            padding: 15px;
            color: #991b1b;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .gc-footer {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            margin-top: 30px;
        }
        @media (max-width: 768px) {
            .gc-widget {
                padding: 20px;
            }
            .gc-amounts {
                grid-template-columns: 1fr;
            }
            .gc-row {
                grid-template-columns: 1fr;
            }
        }
    </style>

    <script>
        (function() {
            const root = document.getElementById('gift-card-widget-root');
            const config = window.GIFT_CARD_CONFIG;

            let selectedAmount = 50;
            let isCustomAmount = false;

            function render() {
                root.innerHTML = `
                    <div class="gc-widget">
                        <div class="gc-header">
                            <h2>🎁 Purchase Gift Card</h2>
                            <p>Give the gift of choice</p>
                        </div>

                        <form id="gift-card-form">
                            <div class="gc-form-group">
                                <label>Select Amount</label>
                                <div class="gc-amounts">
                                    <button type="button" class="gc-amount-btn ${!isCustomAmount && selectedAmount === 50 ? 'active' : ''}" data-amount="50">€50</button>
                                    <button type="button" class="gc-amount-btn ${!isCustomAmount && selectedAmount === 100 ? 'active' : ''}" data-amount="100">€100</button>
                                    <button type="button" class="gc-amount-btn ${!isCustomAmount && selectedAmount === 200 ? 'active' : ''}" data-amount="200">€200</button>
                                </div>
                                <label style="margin-top: 15px;">Custom Amount (min. €50)</label>
                                <input type="number" id="custom-amount" min="50" step="1" placeholder="€50" />
                            </div>

                            <div class="gc-section">
                                <h3>Recipient Information</h3>
                                <div class="gc-row">
                                    <div class="gc-form-group">
                                        <label>Recipient Name *</label>
                                        <input type="text" id="recipient-name" required />
                                    </div>
                                    <div class="gc-form-group">
                                        <label>Recipient Email *</label>
                                        <input type="email" id="recipient-email" required />
                                    </div>
                                </div>
                            </div>

                            <div class="gc-section">
                                <h3>Your Information</h3>
                                <div class="gc-row">
                                    <div class="gc-form-group">
                                        <label>Your Name *</label>
                                        <input type="text" id="buyer-name" required />
                                    </div>
                                    <div class="gc-form-group">
                                        <label>Your Email *</label>
                                        <input type="email" id="buyer-email" required />
                                    </div>
                                </div>
                            </div>

                            <div class="gc-form-group">
                                <label>Personal Message (Optional)</label>
                                <textarea id="message" maxlength="500" placeholder="Add a personal message..."></textarea>
                            </div>

                            <div id="error-message"></div>

                            <div class="gc-total">
                                <div class="gc-total-row">
                                    <span class="gc-total-label">Total Amount:</span>
                                    <span class="gc-total-amount" id="total-amount">€${selectedAmount.toFixed(2)}</span>
                                </div>
                                <p class="gc-total-note">Gift card will be delivered via email immediately after payment</p>
                            </div>

                            <button type="submit" class="gc-submit-btn" id="submit-btn">
                                🎁 Purchase Gift Card
                            </button>

                            <div class="gc-footer">
                                By purchasing, you agree to our terms and conditions. Gift cards are valid for 1 year from purchase date.
                            </div>
                        </form>
                    </div>
                `;

                attachEventListeners();
            }

            function attachEventListeners() {
                const amountBtns = root.querySelectorAll('.gc-amount-btn');
                const customAmountInput = root.querySelector('#custom-amount');
                const form = root.querySelector('#gift-card-form');
                const totalDisplay = root.querySelector('#total-amount');

                amountBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        selectedAmount = parseInt(this.dataset.amount);
                        isCustomAmount = false;
                        customAmountInput.value = '';
                        totalDisplay.textContent = '€' + selectedAmount.toFixed(2);
                        render();
                    });
                });

                customAmountInput.addEventListener('input', function() {
                    const value = parseFloat(this.value);
                    if (!isNaN(value) && value >= 50) {
                        selectedAmount = value;
                        isCustomAmount = true;
                        totalDisplay.textContent = '€' + selectedAmount.toFixed(2);
                    }
                });

                form.addEventListener('submit', async function(e) {
                    e.preventDefault();

                    const submitBtn = root.querySelector('#submit-btn');
                    const errorDiv = root.querySelector('#error-message');

                    submitBtn.disabled = true;
                    submitBtn.textContent = '⏳ Processing...';
                    errorDiv.innerHTML = '';

                    try {
                        const response = await fetch(config.supabaseUrl + '/functions/v1/purchase-gift-card', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + config.supabaseAnonKey
                            },
                            body: JSON.stringify({
                                amount: selectedAmount,
                                recipientName: root.querySelector('#recipient-name').value,
                                recipientEmail: root.querySelector('#recipient-email').value,
                                buyerName: root.querySelector('#buyer-name').value,
                                buyerEmail: root.querySelector('#buyer-email').value,
                                message: root.querySelector('#message').value
                            })
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(data.error || 'Failed to process payment');
                        }

                        if (data.checkoutUrl) {
                            window.location.href = data.checkoutUrl;
                        }
                    } catch (error) {
                        errorDiv.innerHTML = '<div class="gc-error">' + error.message + '</div>';
                        submitBtn.disabled = false;
                        submitBtn.textContent = '🎁 Purchase Gift Card';
                    }
                });
            }

            render();
        })();
    </script>
    <?php
    return ob_get_clean();
}

add_shortcode('gift_card_widget', 'gift_card_widget_shortcode');

function gift_card_widget_enqueue_scripts() {
    wp_enqueue_style('gift-card-widget-style', plugins_url('style.css', __FILE__));
}
add_action('wp_enqueue_scripts', 'gift_card_widget_enqueue_scripts');
